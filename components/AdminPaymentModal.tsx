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

interface AdminPaymentModalProps {
  accounts: LedgerAccount[]
  budgets: any[]
  opened: boolean
  onClose(): any
  onNewTransactions(transactions: any): any
  [x: string | number | symbol]: unknown
}

export default function AdminPaymentModal(props: AdminPaymentModalProps) {
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
      type: 'charge',
      description: '',
      in_budget_id: '',
      out_budget_id: '',
      payments: [],
      due_date: dayjs().add(1, 'day')
    },
    validate: {
      type: (value) => (value !== 'charge' && value !== 'reimburse') ? 'Type must be either charge or reimburse' : null,
      description: (value) => (value.length <= 5) ? 'Description must be greater than 5 characters' : null
    }
  });
  dayjs.extend(utc)
  const [loading, setLoading] = useState(false)

  const supabase = createClientComponentClient()

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

    const query = await squel.insert()
      .into("ledger_transactions")
      .setFieldsRows(paymentForm.values.payments)
      .toString()

    setLoading(true)

    await supabase.rpc('as_admin', {
      "sql_query": `WITH inserted AS ( ${query} RETURNING * )
    SELECT json_agg(t) FROM (SELECT * FROM inserted) t` })
      .then(async (res) => {
        if (props.onNewTransactions) {
          props.onNewTransactions(res.data);
        }
        const response_data: any[] = res.data
        const budget_data = []
        response_data.map((value, index) => {
          budget_data.push({
            ledger_transaction: value.id,
            in_budget_id: paymentForm.values.in_budget_id,
            out_budget_id: paymentForm.values.out_budget_id,
            description: paymentForm.values.description,
            amount: Math.abs(value.amount)
          })
        })
        const budget_query = await squel.insert()
          .into("budget_transactions")
          .setFieldsRows(budget_data)
          .toString()

        await supabase.rpc('as_admin', {
          "sql_query": `WITH inserted AS ( ${budget_query} RETURNING * )
        SELECT json_agg(t) FROM (SELECT * FROM inserted) t` })

        setLoading(false)
        closeModal()
      })
  }

  const name = (payment) => {
    const acct = props.accounts.find((value) => {
      return value.id == payment.account_id
    })
    return (<Text size='sm'>{acct.first_name} {acct.last_name}</Text>)
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

  const validate = () => {
    paymentForm.setFieldValue('payments', [])
    if (checked.length <= 0) {
      paymentForm.setFieldError('payments', "You must make at least one payment")
    }
    checked.map((value, index) => {
      if (value.checked_amount <= 0) {
        paymentForm.setFieldError('payments', "All amounts should be non-zero")
      }
      paymentForm.insertListItem('payments',
        {
          account_id: value.id,
          amount: (paymentForm.values.type == "charge" ? value.checked_amount * -100 : value.checked_amount * 100),
          description: paymentForm.values.description,
          due_date: dayjs(paymentForm.values.due_date).utc().format('YYYY-MM-DD HH:mm:ssZ'),
        });
    })
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
      <Modal opened={props.opened} onClose={closeModal} closeOnClickOutside={false} title={<Text fw={700}>Create a payment</Text>}>
        {!paymentLocked ? (<>
          <Input.Wrapper ref={ref} required mb={15} description={"Charge → member pays, Reimburse → organization pays"} label={`What kind of payment is this?`} {...paymentForm.getInputProps('type')}>

            <SimpleGrid cols={2} mt={10} spacing="xs">
              <Button fullWidth
                disabled={paymentLocked}
                onClick={() => paymentForm.setFieldValue('type', 'charge')}
                variant={paymentForm.values.type == "charge" ? "filled" : "outline"}>Charge</Button>
              <Button fullWidth
                disabled={paymentLocked}
                onClick={() => paymentForm.setFieldValue('type', 'reimburse')}
                variant={paymentForm.values.type == "reimburse" ? "filled" : "outline"}>Reimburse</Button>
            </SimpleGrid>
          </Input.Wrapper>

          <Input.Wrapper required mb={15} description="Members will see this on their online statement" label={`What is this ${(paymentForm.values.type == "charge" ? "charge" : "reimbursement")} for?`} {...paymentForm.getInputProps('description')}>
            <Input disabled={paymentLocked} placeholder={(paymentForm.values.type == "charge" ? "Saturday night poker buy-in" : "Completely legal Friday night purchases")}  {...paymentForm.getInputProps('description')} />
          </Input.Wrapper>

          {(paymentForm.values.type == "charge" ? <DatePickerInput
            label="When is the payment due?"
            // placeholder="Pick date"
            mb={15}
            required
            firstDayOfWeek={0}
            minDate={new Date()}
            valueFormat='ddd, MMM D, YYYY'
            description="Members will be reminded every day after this date to pay"
            {...paymentForm.getInputProps('due_date')}
          /> : null)}

          <Input.Wrapper
            required
            mb={15}
            label={`Who would you like to ${(paymentForm.values.type == "charge" ? "charge" : "reimburse")}?`}
            description="Pro tip: you only need to enter the amount once">
            <Input.Error>{(paymentForm.errors["payments"] ? paymentForm.errors["payments"] : null)}</Input.Error>
            {values.map((value, index) => {
              return (<Group key={value.id} my={"xs"}>
                <Checkbox
                  disabled={paymentLocked}
                  checked={value.checked}
                  onChange={(event) => handlers.setItemProp(index, 'checked', event.currentTarget.checked)}
                  label={`${value.first_name} ${value.last_name}`}
                  key={value.id}
                  onClick={(event) => {
                    if (!value.checked_amount) {
                      handlers.setItemProp(index, 'checked_amount', Number(defaultAmount));
                    }
                  }}
                />
                {
                  value.checked ? (
                    <NumberInput
                      key={value.id}
                      disabled={paymentLocked}
                      defaultValue={defaultAmount}
                      value={value.checked_amount}
                      onChange={(event) => {
                        handlers.setItemProp(index, 'checked_amount', Number(event));
                        setDefaultAmount(Number(event))
                      }}
                      decimalScale={2}
                      fixedDecimalScale
                      leftSection={<IconCurrencyDollar></IconCurrencyDollar>}
                      w={150}
                    />
                  ) : null
                }
              </Group>)
            })}




          </Input.Wrapper>


          <Button fullWidth onClick={validate}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>


        </>) : (
          <>
            <Button fullWidth mb={15} variant='outline' onClick={() => setPaymentLocked(false)}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>
            <Text mb={5}>You are authorizing a <Text span fw={700}>{`${(paymentForm.values.type == "charge" ? "debit" : "credit")}`}</Text> for <Text span fw={700}>{paymentForm.values.description}</Text> to the following:</Text>

            <Table mb={20}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Amount ($)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{paymentForm.values.payments.map((payment) => (
                <Table.Tr key={payment.account_id}>
                  <Table.Td>{name(payment)}</Table.Td>
                  <Table.Td>{Math.abs(Number(payment.amount / 100)).toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}</Table.Tbody>
            </Table>
            <Input.Wrapper mb={20} required label="Transfer to">

              <Combobox
                store={budgets_in}
                onOptionSubmit={(val) => {
                  paymentForm.setFieldValue('in_budget_id', val)
                  budgets_in.closeDropdown();
                }}
              // size="xs"
              >
                <Combobox.Target>
                  <InputBase
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => budgets_in.toggleDropdown()}
                    // size="sm"
                    my={5}
                  >
                    {<Text>{(props.budgets ? findBudget(paymentForm.values.in_budget_id).name : "")}</Text> || <Input.Placeholder>Pick value</Input.Placeholder>}
                  </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown>
                  <Combobox.Options>{(props.budgets ? props.budgets.map((item) => (
                    <Combobox.Option value={item.id} key={item.id}>
                      {item.name}
                    </Combobox.Option>
                  )) : null)}</Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            </Input.Wrapper>
            <form onSubmit={paymentForm.onSubmit(submitTransactions)}>

              <Button type='submit' fullWidth variant='filled' disabled={(paymentForm.values.payments.length == 0 || paymentForm.values.in_budget_id.length == 0)}>Authorize</Button>
            </form>
          </>
        )}


      </Modal >
    </>
  )
}