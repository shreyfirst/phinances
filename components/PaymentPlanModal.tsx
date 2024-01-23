'use client'

import { Button, Checkbox, Combobox, Container, Grid, Group, Input, InputBase, Modal, NumberInput, SimpleGrid, Space, Stack, Table, Text, Title, useCombobox } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from '@mantine/form';
import squel from 'squel';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import createPaymentPlan from './paymentPlanUtils';


type LedgerAccount = {
  id: string
  createdAt: Date
  first_name: string
  last_name: string
  email_address: string
  userId: string
  balance: number
  checked?: boolean
  checked_amount?: number
};

interface PaymentPlanModalProps {
  accounts: LedgerAccount[]
  budgets: any[]
  opened: boolean
  transaction: any
  onClose(): any
  onNewTransactions(transactions: any): any
  [x: string | number | symbol]: unknown
}

export default function PaymentPlanModal(props: PaymentPlanModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [values, handlers] = useListState([]);
  const [defaultAmount, setDefaultAmount] = useState(0)
  const [paymentLocked, setPaymentLocked] = useState(false)
  const checked = values.filter((value) => value.checked == true)
  const budgets_in = useCombobox({
    onDropdownClose: () => budgets_in.resetSelectedOption(),
  });

  const paymentForm = useForm({
    initialValues: {
      installments: '',
      transaction: {
        "created_at": "",
        "description": "",
        "account_id": "",
        "increase": "",
        "outflow": 0,
        "inflow": 0,
        "due_date": "",
        "id": "",
        "amount": 0,
        "true_amount": 0,
        "approved": null
      },
      payments: [],
      first_day: dayjs().add(1, 'day'),
      last_day: dayjs().add(5, 'week')
    }
  });
  dayjs.extend(utc)
  const [loading, setLoading] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(()=>{

    if (props.transaction) {
      paymentForm.setFieldValue('transaction', props.transaction)
    }

  },[props.transaction])

  useEffect(() => {
    if (props.accounts) {
      props.accounts.map((value, index) => {
        const temp = {
          ...value,
          checked: false
        }
        handlers.setItem(index, temp)
      })
    }

  }, [props.accounts])

  useEffect(() => {
    if (props.budgets) {
      props.budgets.map((value, index) => {
        if (value.type == 'PAYMENT_REQUESTS') {
          paymentForm.setFieldValue('out_budget_id', value.id)
        }
      })
    }

  }, [props.budgets])

  async function submitTransactions(data) {

    setLoading(true)

    const change = await squel.update().table('ledger_transactions')
    .where(`id = '${paymentForm.values.transaction.id}'`)
    .setFields({
      amount: 0,
      payment_plan: true
    }).toString()

    await supabase.rpc('as_admin', {
      "sql_query": `WITH inserted AS ( ${change} RETURNING * )
    SELECT json_agg(t) FROM (SELECT * FROM inserted) t` }).then(async ()=>{



      const query = await squel.insert()
      .into("ledger_transactions")
      .setFieldsRows(paymentForm.values.payments)
      .toString()


    await supabase.rpc('as_admin', {
      "sql_query": `WITH inserted AS ( ${query} RETURNING * )
    SELECT json_agg(t) FROM (SELECT * FROM inserted) t` })
      .then(async (res) => {
        if (props.onNewTransactions) {
          props.onNewTransactions(res.data);
        }
        const response_data: any[] = res.data

        setLoading(false)
        closeModal()
      })

    })

  }

  const name = (payment) => {
    const acct = props.accounts.find((value) => {
      return value.id == payment.account_id
    })
    if (acct) {
      return (acct.first_name + " " + acct.last_name)
    } else {
      return ""
    }
    
  }

  const findBudget = useMemo(() => {
    const budgetFinder = (budget_id) => {
      if (props.budgets) {
        const budget = props.budgets.find((budget) => budget.id === budget_id)
        return budget ? budget : { name: null }
      }
    }
    return budgetFinder
  }, [props.budgets])

  const closeModal = () => {
    paymentForm.reset()
    handlers.setState(props.accounts)
    props.onClose()
  }

  const validate = async () => {
    paymentForm.setFieldValue('payments', [])
    const payments = createPaymentPlan(paymentForm.values.first_day.toISOString(), paymentForm.values.last_day.toISOString(), Number(paymentForm.values.transaction.amount), Number(paymentForm.values.installments))

    payments.map((value, index) => {
      paymentForm.insertListItem('payments',
        {
          account_id: paymentForm.values.transaction.account_id,
          amount: Number(value.amount),
          description: `${paymentForm.values.transaction.description} (#${value.installmentNumber})`,
          due_date: dayjs(value.dueDate).utc().format('YYYY-MM-DD HH:mm:ssZ'),
          parent: paymentForm.values.transaction.id,
          payment_plan: true
        })
    })

    // checked.map((value, index) => {
    //   if (value.checked_amount <= 0) {
    //     paymentForm.setFieldError('payments', "All amounts should be non-zero")
    //   }

    // })
    paymentForm.validate()
    if (paymentForm.isValid() == true) {
      // console.log(paymentForm.values.payments)
      setPaymentLocked(true)
    } else {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      console.log(paymentForm.errors)
    }
  }

  return (
    <>
      <Modal opened={props.opened} onClose={closeModal} closeOnClickOutside={false} title={<Text fw={700}>Create a payment plan</Text>}>

        {!paymentLocked ? (<>
          <DatePickerInput
            label="Plan start date"
            // placeholder="Pick date"
            mb={15}
            required
            firstDayOfWeek={0}
            minDate={new Date()}
            valueFormat='ddd, MMM D, YYYY'
            description="The first payment is due on this day"
            {...paymentForm.getInputProps('first_day')}
          />
          <DatePickerInput
            label="Plan last date"
            // placeholder="Pick date"
            mb={15}
            required
            firstDayOfWeek={0}
            minDate={new Date()}
            valueFormat='ddd, MMM D, YYYY'
            description="The last payment is due on this day"
            {...paymentForm.getInputProps('last_day')}
          />

          <NumberInput
            label="Number of installments"
            description="How many total payments should there be?"
            placeholder="8"
            allowDecimal={false}
            allowNegative={false}
            mb={15}
            required
            {...paymentForm.getInputProps('installments')}
          />


          <Button fullWidth onClick={validate}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>


        </>) : (
          <>
            <Button fullWidth mb={15} variant='outline' onClick={() => setPaymentLocked(false)}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>
            <Text mb={5}>You are authorizing a payment plan to <Text span fw={700}>{name(paymentForm.values.transaction)}</Text> for <Text span fw={700}>{paymentForm.values.transaction.description}</Text> to the following:</Text>

            <Table mb={20}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Due date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{paymentForm.values.payments.map((payment) => (
                <Table.Tr key={payment.account_id}>
                  <Table.Td>{Math.abs(Number(payment.amount / 100)).toFixed(2)}</Table.Td>
                  <Table.Td>{new Date(payment.due_date).toDateString()}</Table.Td>
                </Table.Tr>
              ))}</Table.Tbody>
            </Table>
            <form onSubmit={paymentForm.onSubmit(submitTransactions)}>

              <Button type='submit' fullWidth variant='filled' disabled={(paymentForm.values.payments.length == 0 )}>Authorize</Button>
            </form>
          </>
        )}

      </Modal >
    </>
  )
}