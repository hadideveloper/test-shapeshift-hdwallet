import * as core from "@shapeshiftoss/hdwallet-core";
import * as trezorConnect from "@shapeshiftoss/hdwallet-trezor-connect";
import * as walletConnectv2 from "@shapeshiftoss/hdwallet-walletconnectv2";
import * as metaMask from "@shapeshiftoss/hdwallet-metamask";
import { EthereumProviderOptions } from "@walletconnect/ethereum-provider/dist/types/EthereumProvider";
import { Request, newHttpClient } from 'typescript-http-client';
import { EthereumAddressModel } from '../blockchain/BlockbookEthereumModel';
import Web3 from "web3";


const _keyring = new core.Keyring();

export enum WalletModelEnum {
    None = 'none',
    Trezor = 'trezor',
    WalletConnect = 'walletconnect',
    MetaMask = 'metamask'
}

export enum CoinModelEnum {
    None = 'none',
    Bitcoin = 'bitcoin',
    Ethereum = 'ethereum'
}

class WalletServiceResponse {
    public IsSuccess: boolean = false;
    public Message: string = '';
    public Data: any;
}


class WalletService {
    
    //! adapter & device
    private _adapter: any;
    private _deviceId = '';
    private _isConnected = false;

    //! wallets
    private _walletModel: WalletModelEnum = WalletModelEnum.None;
    private _wallet: any;

    constructor() {
        _keyring.on(["*", "*", core.Events.CONNECT], async (deviceId) => {
            this._onDeviceConnected(deviceId);
            this._isConnected = true;
        });
      
        _keyring.on(["*", "*", core.Events.DISCONNECT], async (deviceId) => {
            this._deviceId = '';
            this._isConnected = false;
        });
    }

    public get IsConnected(): boolean {
        return this._isConnected;
    }

    public get DeviceId(): string {
        return this._deviceId;
    }

    public async Connect(walletModel: WalletModelEnum): Promise<WalletServiceResponse> {
        switch(walletModel) {
            case WalletModelEnum.Trezor:
                this._walletModel = WalletModelEnum.Trezor;
                return await this._connectTrezor();
            case WalletModelEnum.WalletConnect:
                this._walletModel = WalletModelEnum.WalletConnect;
                return await this._connectWalletConnect();
            case WalletModelEnum.MetaMask:
                this._walletModel = WalletModelEnum.MetaMask;
                return await this._connectMetaMask();
        }

        return {
            IsSuccess: false,
            Message: 'Invalid wallet model',
            Data: null
        };
    }

    public async GetAddress(coin: CoinModelEnum, path: string): Promise<WalletServiceResponse> {
        if(this._wallet == null) {
            return {
                IsSuccess: false,
                Message: 'No device',
                Data: null
            };
        }

        //! Convert path to number array
        const pathArray = core.bip32ToAddressNList(path);

        //! If coin is BTC
        if(coin == CoinModelEnum.Bitcoin) {
            //! Check if wallet supports BTC
            if(core.supportsBTC(this._wallet) == false) {
                return {
                    IsSuccess: false,
                    Message: 'Wallet does not support BTC',
                    Data: null
                };
            }

            const params = {
                addressNList: pathArray,
                coin: "Bitcoin",
                scriptType: core.BTCInputScriptType.SpendAddress,
                showDisplay: false,
            };

            let address = await this._wallet.btcGetAddress(params);
            return {
                IsSuccess: true,
                Message: '',
                Data: address
            };
        }
        else if(coin == CoinModelEnum.Ethereum) {
            //! Check if wallet supports ETH
            if(core.supportsETH(this._wallet) == false) {
                return {
                    IsSuccess: false,
                    Message: 'Wallet does not support ETH',
                    Data: null
                };
            }

            const params = {
                addressNList: pathArray,
                showDisplay: false,
            };

            let address = await this._wallet.ethGetAddress(params);
            return {
                IsSuccess: true,
                Message: '',
                Data: address
            };
        }

        return {
            IsSuccess: false,
            Message: 'Invalid coin model',
            Data: null
        };
    }

    public async GetPublicKey(coin: CoinModelEnum, path: string): Promise<WalletServiceResponse> {
        if(this._wallet == null) {
            return {
                IsSuccess: false,
                Message: 'No device',
                Data: null
            };
        }

        //! If coin is BTC
        if(coin == CoinModelEnum.Bitcoin) {
            //! Check if wallet supports BTC
            if(core.supportsBTC(this._wallet) == false) {
                return {
                    IsSuccess: false,
                    Message: 'Wallet does not support BTC',
                    Data: null
                };
            }

            const params = {
                addressNList: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0],
                coin: "Bitcoin",
                scriptType: core.BTCInputScriptType.SpendAddress,
                showDisplay: false,
            };

            let publicKey = await this._wallet.btcGetPublicKey(params);
            return {
                IsSuccess: true,
                Message: '',
                Data: publicKey
            };
        } else if(coin == CoinModelEnum.Ethereum) {
            //! Check if wallet supports ETH
            if(core.supportsETH(this._wallet) == false) {
                return {
                    IsSuccess: false,
                    Message: 'Wallet does not support ETH',
                    Data: null
                };
            }

            const params = {
                addressNList: [0x80000000 + 44, 0x80000000 + 60, 0x80000000 + 0],
                showDisplay: false,
            };

            let publicKey = await this._wallet.ethGetPublicKey(params);
            return {
                IsSuccess: true,
                Message: '',
                Data: publicKey
            };
        }

        return {
            IsSuccess: false,
            Message: 'Invalid coin model',
            Data: null
        };

    }

    public async GenerateEthTransaction(toAddress: string, amount: string): Promise<WalletServiceResponse> {

        //! Now we only support user's account 0
        const pathArray: core.BIP32Path = core.bip32ToAddressNList(`m/44'/60'/0'/0/0`);

        //! Get address from device
        let address = await this._wallet.ethGetAddress({
            addressNList: pathArray,
            showDisplay: false,
        });

        if(address == null) {
            return {
                IsSuccess: false,
                Message: 'No address',
                Data: null
            };
        }

        //! Now we only use Prokey Blockchain service to get address account info
        //! Call Prokey api to get eth account info
        let addressInfo = await this._getFromServer<EthereumAddressModel>(`https://eth.prokey.app/blockbook/eth/api/v2/address/${address}`);

        //! Get MaxFeePerGas, MaxPriorityFeePerGas, GasLimit from Web3
        //! For now, we use Goerli testnet
        let web3 = new Web3("https://ethereum-goerli.publicnode.com");

        let gasPrice = await web3.eth.getGasPrice();

        //! Get base fee from latest block
        let baseFee = (await web3.eth.getBlock("latest")).baseFeePerGas;

        //! Set MaxPriorityFeePerGas to 1.5 Gwei, now it's fixed
        let maxPriorityFeePerGas: bigint = BigInt("1500000000");
        let maxFeePerGas: bigint | undefined;

        let valueInWei = web3.utils.toWei(amount, 'ether');
        
        if (baseFee !== undefined) {
            maxFeePerGas = (BigInt(baseFee) * BigInt(2)) + maxPriorityFeePerGas;
        }

        console.log('baseFee', baseFee);
        console.log('maxPriorityFeePerGas', maxFeePerGas);

        if (addressInfo == null) {
            return {
                IsSuccess: false,
                Message: 'No address info',
                Data: null
            };
        }

        let valueToSend = '';
        //! For metamask, we need to convert value to hex
        if(this._walletModel == WalletModelEnum.MetaMask) {
            valueToSend = web3.utils.numberToHex(valueInWei);
        }
        else {
            valueToSend = valueInWei;
        }

        let tx: core.ETHSignTx;

        //! EIP-1559
        if(baseFee !== undefined) {
            tx = {
                addressNList: pathArray,
                to: toAddress,
                value: valueToSend,
                data: '',
                chainId: 5,
                nonce: '0x' + addressInfo.nonce,
                gasLimit: '0x35B60',
                maxPriorityFeePerGas: '0x' + maxPriorityFeePerGas.toString(16),
                maxFeePerGas: '0x' + (maxFeePerGas?.toString(16) ?? ''),
            };
        } 
        else //! Legacy 
        {
            tx = {
                addressNList: pathArray,
                to: toAddress,
                value: valueToSend,
                data: '',
                chainId: 5,
                nonce: '0x' + addressInfo.nonce,
                gasLimit: '0x35B60',
                gasPrice: '0x' + gasPrice.toString(16),
            };
        }

        console.log('Generated Tx', tx);

            return {
                IsSuccess: true,
                Message: '',
                Data: tx
            }
        }

    public async SignEthTransaction(tx: core.ETHSignTx): Promise<WalletServiceResponse> {
        if(this._wallet == null) {
            return {
                IsSuccess: false,
                Message: 'No device',
                Data: null
            };
        }

        //! Check if wallet supports ETH
        if(core.supportsETH(this._wallet) == false) {
            return {
                IsSuccess: false,
                Message: 'Wallet does not support ETH',
                Data: null
            };
        }

        let signedTx = await this._wallet.ethSendTx(tx);
        console.log('SignedTx', signedTx);
        if(signedTx == null) {
            return {
                IsSuccess: false,
                Message: 'No signed tx',
                Data: null
            };
        }

        return {
            IsSuccess: true,
            Message: '',
            Data: signedTx
        };
    }

    private async _connectTrezor(): Promise<WalletServiceResponse> {
        console.log("Connecting to Trezor");

        //! Set wallet model
        this._walletModel = WalletModelEnum.Trezor;

        //! Set adapter
        this._adapter = trezorConnect.TrezorAdapter.useKeyring(_keyring, {
            debug: false,
            manifest: {
                email: "info@paymento.io",
                appUrl: "https://paymento.io",
            }
        });

        try {
            //! Set wallet
            this._wallet = await this._adapter.pairDevice();
            if(this._wallet == null) {
                return {
                    IsSuccess: false,
                    Message: 'No device',
                    Data: null
                };
            }

        } catch (error) {
            console.log(error);
            return {
                IsSuccess: false,
                //! If error is string then message is error, else message is empty
                Message: typeof error == 'string' ? error : '',
                Data: null
            };
        }

        return {
            IsSuccess: true,
            Message: '',
            Data: null
        };
    }

    private async _connectWalletConnect(): Promise<WalletServiceResponse> {
        console.log("Connecting to WalletConnect");

        const walletConnectV2Options: EthereumProviderOptions = {
            projectId: "5abef0455c768644c2bc866f1520374f",
            chains: [1],
            optionalChains: [100],
            optionalMethods: [
              "eth_signTypedData",
              "eth_signTypedData_v4",
              "eth_sign",
              "ethVerifyMessage",
              "eth_accounts",
              "eth_sendTransaction",
              "eth_signTransaction",
            ],
            showQrModal: true,
        };

        //! Set wallet model
        this._walletModel = WalletModelEnum.WalletConnect;

        //! Set adapter
        this._adapter = walletConnectv2.WalletConnectV2Adapter.useKeyring(_keyring, walletConnectV2Options);

        try
        {
            //! Set wallet
            this._wallet = await this._adapter.pairDevice();
            if(this._wallet == null) {
                return {
                    IsSuccess: false,
                    Message: 'No device',
                    Data: null
                };
            }
        }
        catch(error) {
            console.log(error);
            return {
                IsSuccess: false,
                //! If error is string then message is error, else message is empty
                Message: typeof error == 'string' ? error : '',
                Data: null
            };
        }

        return {
            IsSuccess: true,
            Message: '',
            Data: null
        };
    }

    private async _connectMetaMask(): Promise<WalletServiceResponse> {
        console.log("Connecting to MetaMask");

        //! Set wallet model
        this._walletModel = WalletModelEnum.MetaMask;

        //! Set adapter
        this._adapter = metaMask.MetaMaskAdapter.useKeyring(_keyring);

        try
        {
            //! Set wallet
            this._wallet = await this._adapter.pairDevice();
            if(this._wallet == null) {
                return {
                    IsSuccess: false,
                    Message: 'No device',
                    Data: null
                };
            }
        }
        catch(error) {
            console.log(error);
            return {
                IsSuccess: false,
                //! If error is string then message is error, else message is empty
                Message: typeof error == 'string' ? error : '',
                Data: null
            };
        }

        return {
            IsSuccess: true,
            Message: '',
            Data: null
        };
    }

    private async _onDeviceConnected(deviceId: string){
        this._deviceId = deviceId;
        this._wallet = _keyring.get(deviceId);
    }

    /**
     * This is a private helper function to GET data from server
     * @param url URL + data
     * @param changeJson a callback for adjust json before casting
     */
    private async _getFromServer<T>(url: string) {
        const client = newHttpClient();

        const request = new Request(url, { method: 'GET' });

        return await client.execute<T>(request);
    }
}

export default WalletService;
