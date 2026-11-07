"use client";
import {OperationsOverview} from './operations-overview';
import {FujiWallet} from './fuji-wallet';
import {FundsPage} from './funds-page';
export function BuyerOverview({funds=false}:{funds?:boolean}){return funds?<><FujiWallet role="Compras"/><FundsPage/></>:<OperationsOverview/>;}
