import type {SharedOrder} from './demo-model';
import {finances} from './order-finances';
import {contractBalance,contractLimits,toMajor,type FinanceState} from './finance-model';

// Receipt establishes payment eligibility; only a registered payment reduces escrow.
export function orderAccount(order:SharedOrder,finance:FinanceState|undefined,now=new Date().toISOString()){
 const fallback=finances(order);
 const contract=finance?.contracts.find(c=>c.orderId===order.id);
 if(!finance||!contract)return {...fallback,paid:order.paid};
 return {...fallback,held:toMajor(contractBalance(contract)),released:toMajor(contractLimits(finance,contract,now).payment),paid:toMajor(contract.paid),advance:toMajor(contract.advancePaid),refunded:toMajor(contract.refunded),receivable:contract.commercialCanceled?0:toMajor(Math.max(0,contract.principal-contract.paid-contract.refunded))};
}
