import { Component, OnDestroy, OnInit } from '@angular/core';
import WalletService from '../services/wallet.service';
import { WalletModelEnum } from '../services/wallet.service';
import { CoinModelEnum } from '../services/wallet.service';

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

  //! private variables
  private _walletService: WalletService;

  constructor(walletService: WalletService) {
    this._walletService = walletService;
  }

  ngOnInit(): void {
  }

  async btnConnectTrezor(){
    let res = await this._walletService.Connect(WalletModelEnum.Trezor);
    if (res.IsSuccess) {
      this.deviceId = this._walletService.DeviceId;
    } else {
      this.deviceId = 'CANNOT CONNECT';
    }
  }

  async btnWalletConnect() {
    let res = await this._walletService.Connect(WalletModelEnum.WalletConnect);
    if (res.IsSuccess) {
      this.deviceId = this._walletService.DeviceId;
    } else {
      this.deviceId = 'CANNOT CONNECT';
    }
  }

  async btnConnectLedger(){
    console.log("Connecting to Ledger");
  }

  async btnConnectMetamask(){
    let res = await this._walletService.Connect(WalletModelEnum.MetaMask);
    if (res.IsSuccess) {
      this.deviceId = this._walletService.DeviceId;
    } else {
      this.deviceId = 'CANNOT CONNECT';
    }
  }

  async btnGetPublicKey() {
    console.log("Getting Public Key");

    let res = await this._walletService.GetPublicKey(CoinModelEnum.Ethereum, `m/44'/0'/0'`);
    console.log(res);
    if(res.IsSuccess){
      this.devReturn = res.Data;
    }
    else {
      this.devReturn = res.Message;
    }

  }

  async btnBtcGetAddress() {
    console.log("Getting BTC Address");
    let res = await this._walletService.GetAddress(CoinModelEnum.Bitcoin, `m/44'/0'/0'/0/0`);
    console.log(res);
    if(res.IsSuccess){
      this.devReturn = res.Data;
    }
    else {
      this.devReturn = res.Message;
    }
    
  }

  async btnEthGetAddress() {
    console.log("Getting ETH Address");
    let res = await this._walletService.GetAddress(CoinModelEnum.Ethereum, `m/44'/60'/0'/0/0`);
    console.log(res);
    if(res.IsSuccess){
      this.devReturn = res.Data;
    }
    else {
      this.devReturn = res.Message;
    }
  }

  async btnSignEthTx() {
    console.log("Signing ETH Tx");

    let res = await this._walletService.GenerateEthTransaction(
      '0xb9D3e45AAEE1Ab9a5B87ff8bC999867A99897A78',
      '0.001'
    )

    if(res.IsSuccess == false){
      this.devReturn = res.Message;
      return;
    }

    let tx = res.Data;
    console.log("btnSignEthTx->", tx);

    res = await this._walletService.SignEthTransaction(tx);
    console.log(res);
    if(res.IsSuccess){
      this.devReturn = res.Data;
    }
    else {
      this.devReturn = res.Message;
    }
  }

}
