/**
 * Source of truth for customer accounts in the XYZ Bank demo app.
 *
 * Account numbers are deterministic: the mock data loader creates users in
 * a fixed order and assigns 3 accounts each (Dollar → Pound → Rupee),
 * starting from account number 1001.
 *
 * @see banking-app/mockDataLoadService.js — user creation order
 * @see banking-app/account.service.js     — sequential availableAcctNo++
 */

export type Currency = 'Dollar' | 'Pound' | 'Rupee'

export const CURRENCIES: readonly Currency[] = ['Dollar', 'Pound', 'Rupee'] as const

export interface Customer {
  name: string
  accounts: Record<Currency, string>
}

export const Customers = {
  HermoineGranger: {
    name: 'Hermoine Granger',
    accounts: { Dollar: '1001', Pound: '1002', Rupee: '1003' },
  },
  HarryPotter: {
    name: 'Harry Potter',
    accounts: { Dollar: '1004', Pound: '1005', Rupee: '1006' },
  },
  RonWeasly: {
    name: 'Ron Weasly',
    accounts: { Dollar: '1007', Pound: '1008', Rupee: '1009' },
  },
  AlbusDumbledore: {
    name: 'Albus Dumbledore',
    accounts: { Dollar: '1010', Pound: '1011', Rupee: '1012' },
  },
  NevilleLongbottom: {
    name: 'Neville Longbottom',
    accounts: { Dollar: '1013', Pound: '1014', Rupee: '1015' },
  },
} as const satisfies Record<string, Customer>

/** All account numbers for a given customer, ordered Dollar → Pound → Rupee. */
export function allAccountNumbers(customer: Customer): string[] {
  return CURRENCIES.map((c) => customer.accounts[c])
}
