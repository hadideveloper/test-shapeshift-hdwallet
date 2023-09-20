import { Component } from '@angular/core';
import * as core from "@shapeshiftoss/hdwallet-core";
import * as trezorConnect from "@shapeshiftoss/hdwallet-trezor-connect";

const keyring = new core.Keyring();



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  //! view variables
  title = 'test-shapeshift-hdwallet';
  deviceId = '';

  //! wallet
  private _wallet:any;

  //! wallet adapters
  private readonly _trezorAdapter = trezorConnect.TrezorAdapter.useKeyring(keyring, {
    debug: false,
    manifest: {
      email: "oss@shapeshiftoss.io",
      appUrl: "https://shapeshift.com",
    },
  });

  async btnConnectTrezor(){
    console.log("Connecting to Trezor");
    this._wallet = await this._trezorAdapter.pairDevice();

    this.deviceId = await this._wallet.getDeviceID();

  }

  btnConnectLedger(){
    console.log("Connecting to Ledger");
  }
}
