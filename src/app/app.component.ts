import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'test-shapeshift-hdwallet';

  btnConnectTrezor(){
    console.log("Connecting to Trezor");
    
  }

  btnConnectLedger(){
    console.log("Connecting to Ledger");
  }
}
