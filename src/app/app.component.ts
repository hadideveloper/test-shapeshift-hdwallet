import { Component, OnDestroy, OnInit } from '@angular/core';
import * as core from "@shapeshiftoss/hdwallet-core";
import * as trezorConnect from "@shapeshiftoss/hdwallet-trezor-connect";
import * as walletConnectv2 from "@shapeshiftoss/hdwallet-walletconnectv2";
import { EthereumProviderOptions } from "@walletconnect/ethereum-provider/dist/types/EthereumProvider";

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

const keyring = new core.Keyring();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  //! view variables
  title = 'test-shapeshift-hdwallet';
  deviceId = '';
  event='';
  devReturn='';

  //! wallet
  private _walletModel: 'none' | 'trezor' | 'walletconnect' = 'none';
  private _wallet: any;

  private _adapter: any;


  ngOnInit(): void {
    keyring.on(["*", "*", core.Events.CONNECT], async (deviceId) => {
      this.event = 'device connected';
      await this._onDeviceConnected(deviceId);
    });
  
    keyring.on(["*", "*", core.Events.DISCONNECT], async (deviceId) => {
      this.deviceId = '';
      this.event = 'device removed';
    });
  }

  private async _onDeviceConnected(deviceId: string){
    this.deviceId = deviceId;
    this._wallet = keyring.get(deviceId);
  }

  async btnConnectTrezor(){
    console.log("Connecting to Trezor");

    //! Set wallet model
    this._walletModel = 'trezor';

    //! Set adapter
    this._adapter = trezorConnect.TrezorAdapter.useKeyring(keyring, {
      debug: false,
      manifest: {
        email: "oss@shapeshiftoss.io",
        appUrl: "https://shapeshift.com",
      },
    });

    //! Set wallet
    this._wallet = await this._adapter.pairDevice();

    //! get device id
    this.deviceId = await this._wallet.getDeviceID();

  }

  async btnWalletConnect() {
    console.log("Connecting to WalletConnect");

    //! Set wallet model
    this._walletModel = 'walletconnect';

    //! Set adapter
    this._adapter = walletConnectv2.WalletConnectV2Adapter.useKeyring(keyring, walletConnectV2Options);

    //! Set wallet
    this._wallet = await this._adapter.pairDevice();

    //! get device id
    this.deviceId = await this._wallet.getDeviceID();
  }

  async btnConnectLedger(){
    console.log("Connecting to Ledger");
  }

  async btnGetPublicKey() {
    if(this._wallet==null){
      this.devReturn = 'No device!!';
      return;
    }

    const btcGetPublicKeysInput = [
      {
        coin: "Bitcoin",
        addressNList: [2147483732, 2147483648, 2147483648],
        curve: "secp256k1",
        scriptType: core.BTCInputScriptType.SpendWitness,
      }
    ]

    const result = await this._wallet.getPublicKeys(btcGetPublicKeysInput);

    this.devReturn = JSON.stringify(result)
  }

  async btnGetAddress() {

    if(this._wallet==null){
      this.devReturn = 'No device!!';
      return;
    }

    if(this._walletModel=='walletconnect') {
      console.log('walletconnect get address');
      const result = await this._wallet.ethGetAddress({
        addressNList: [0x80000000 + 44, 0x80000000 + 60, 0x80000000 + 0, 0, 0],
        showDisplay: false,
      });

      this.devReturn = result || 'NULL';
    }
    else if (core.supportsBTC(this._wallet)) {
      const result = await this._wallet.btcGetAddress({
        addressNList: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
        coin: "Bitcoin",
        scriptType: core.BTCInputScriptType.SpendAddress,
        showDisplay: false,
      });

      this.devReturn = result || 'NULL';
    }
  }

}
