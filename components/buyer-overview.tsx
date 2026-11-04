"use client";
import {OperationsOverview} from './operations-overview';
import {FundsPage} from './funds-page';
export function BuyerOverview({funds=false}:{funds?:boolean}){return funds?<FundsPage/>:<OperationsOverview/>;}
