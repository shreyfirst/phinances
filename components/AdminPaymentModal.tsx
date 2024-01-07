'use client'

import { Button, Checkbox, Container, Grid, Group, Input, Modal, NumberInput, SimpleGrid, Space, Stack, Table, Text, Title } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { useEffect, useState } from 'react'
import { useForm } from '@mantine/form';
import squel from 'squel';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
  opened: boolean
  onClose(): any
  onNewTransactions(transactions: any): any
  [x: string | number | symbol]: unknown
}

export default function AdminPaymentModal(props: AdminPaymentModalProps) {
  const [values, handlers] = useListState([]);
  const [defaultAmount, setDefaultAmount] = useState(0)
  const [paymentLocked, setPaymentLocked] = useState(false)
  const checked = values.filter((value) => value.checked == true)
  const paymentForm = useForm({
    initialValues: {
      type: 'charge',
      description: '',
      payments: []
    }
  });
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
    if (paymentLocked) {
      checked.map((value, index) => {
        paymentForm.insertListItem('payments',
          {
            account_id: value.id,
            amount: (paymentForm.values.type == "charge" ? value.checked_amount * -100 : value.checked_amount * 100),
            description: paymentForm.values.description
          });
      })

    } else {
      paymentForm.setFieldValue('payments', [])
    }
  }, [paymentLocked])


  async function submitTransactions(data) {

    const query = await squel.insert()
      .into("ledger_transactions")
      .setFieldsRows(paymentForm.values.payments)
      .toString()

    setLoading(true)

    await supabase.rpc('as_admin', { "sql_query": `WITH inserted AS ( ${query} RETURNING * )
    SELECT json_agg(t) FROM (SELECT * FROM inserted) t` })
    .then((res) => {
      if (props.onNewTransactions) {
        props.onNewTransactions(res.data);
      }
      setLoading(false)
      props.onClose()
    })
    // console.log("data", data)
  }

  const name = (payment) => {
    const acct = props.accounts.find((value)=>{
      return value.id == payment.account_id
    })
    return (<Text size='sm'>{acct.first_name} {acct.last_name}</Text>)
  }

  const closeModal = () => {
    paymentForm.reset()
    handlers.setState(props.accounts)
    props.onClose()
  }

  return (
    <>
      <Modal opened={props.opened} onClose={closeModal} closeOnClickOutside={false} title={<Text fw={700}>Create a payment</Text>}>
        {!paymentLocked ? (<>
          <Input.Wrapper mb={15} description={"Charge → member pays, Reimburse → organization pays"} label={`What kind of payment is this?`}>

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

          <Input.Wrapper mb={15} description="Members will see this on their online statement" label={`What is this ${(paymentForm.values.type == "charge" ? "charge" : "reimbursement")} for?`}>
            <Input disabled={paymentLocked} placeholder={(paymentForm.values.type == "charge" ? "Saturday night poker buy-in" : "Completely legal Friday night purchases")} {...paymentForm.getInputProps("description")} />
          </Input.Wrapper>

          <Input.Wrapper
            mb={15}
            label={`Who would you like to ${(paymentForm.values.type == "charge" ? "charge" : "reimburse")}?`}
            description="Pro tip: you only need to enter the amount once">
            {values.map((value, index) => {
              return (<Group my={"xs"}>
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
          <Button fullWidth onClick={() => setPaymentLocked(!paymentLocked)}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>


        </>) : (
          <>
            <Button fullWidth mb={15} variant='outline' onClick={() => setPaymentLocked(!paymentLocked)}>{paymentLocked ? "Edit payment configuration" : "Review"}</Button>
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
            <form onSubmit={paymentForm.onSubmit(submitTransactions)}>

              <Button type='submit' fullWidth variant='filled'>Authorize</Button>
            </form>
          </>
        )}


      </Modal >
    </>
  )
}