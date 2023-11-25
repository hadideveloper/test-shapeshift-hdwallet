import { Component, OnDestroy, OnInit } from '@angular/core';
import * as core from "@shapeshiftoss/hdwallet-core";
import * as trezorConnect from "@shapeshiftoss/hdwallet-trezor-connect";
import * as ledgerWebUSB from "@shapeshiftoss/hdwallet-ledger-webusb";

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
  private _wallet: any;

  //! wallet adapters
  private _walletName = 'Trezor' || 'Ledger';
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

    this._walletName = 'Trezor';

    this._adapter = trezorConnect.TrezorAdapter.useKeyring(keyring, {
      debug: true,
      manifest: {
        email: "info@paymento.io",
        appUrl: "https://paymento.io",
      },
    });

    this._wallet = await this._adapter.pairDevice();

    this.deviceId = await this._wallet.getDeviceID();

  }

  async btnConnectLedger(){
    console.log("Connecting to Ledger");

    this._walletName = 'Ledger';
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

    if (core.supportsBTC(this._wallet)) {
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
