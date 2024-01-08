'use client'
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Table, Button, Modal, rem, Text, TextInput, Skeleton, Radio, Title, Combobox, InputBase, useCombobox, Stack, Flex, Stepper, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [regForm, regFormHandler] = useDisclosure(false);
    const [modalOpen, { open, close }] = useDisclosure(false);
    const [errors, setErrors] = useState({
        ledger_loading: true
    })
    const supabase = createClientComponentClient()
    const regFormData = useForm({
        initialValues: {
            first_name: '',
            last_name: '',
            email_address: ''
        },
        validate: {
            first_name: isNotEmpty(),
            last_name: isNotEmpty(),
            email_address: isEmail()
        },
    });
    const paymentFormData = useForm({
        initialValues: {
            ledger_transaction_id: '',
            bank_account_id: '',
            // balance_verify: false
        },
        validate: {
            ledger_transaction_id: isNotEmpty(),
            bank_account_id: isNotEmpty(),
            // balance_verify: isNotEmpty()
        },
    });
    const [ledger, setLedger] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [bankAccounts, setBankAccounts] = useState([])
    const bank_select = useCombobox({
        onDropdownClose: () => bank_select.resetSelectedOption(),
    });
    const router = useRouter()
    
    const titleData = transactions.filter((transaction) => {
        if (transaction.id == paymentFormData.values.ledger_transaction_id) {
            return transaction
        }
    })

    useEffect(() => {
        const user = supabase.from('ledger_accounts').select().then(async (res) => {
            if (res.data.length > 0) {
                await setLedger(res.data[0])
            } else {
                await regFormHandler.open()
            }
            setErrors({ ...errors, ledger_loading: false })
        })
        const user_transactions = supabase.from('ledger_transactions').select().order('created_at', { ascending: false }).then(async (res) => {
            setTransactions(res.data)
        })
        const bank_acounts = supabase.from('bank_accounts').select('*').then((res) => {
            setBankAccounts(res.data)
        })
    }, [])

    const submitDataForm = async (dataFormValues) => {
        setErrors({ ...errors, ledger_loading: true })
        await supabase.from('ledger_accounts').insert({
            ...dataFormValues,
            first_name: formatName(dataFormValues.first_name),
            last_name: formatName(dataFormValues.last_name)
        })
        const { data, error } = await supabase.from('ledger_accounts').select()
        if (data) {
            const user = await supabase.from('ledger_accounts').select().then(async (res) => {
                if (res.data.length > 0) {
                    const user_transactions = await supabase.from('ledger_transactions').select().order('created_at', { ascending: false }).then(async (res) => {
                        setTransactions(res.data)
                    })
                    await setLedger(res.data[0])
                }
            })
            await setErrors({ ...errors, ledger_loading: false })
            regFormHandler.close()
        }

    }

    const formatName = (name) => {
        return name
            .trim() // Remove leading and trailing whitespace
            .toLowerCase() // Convert to lowercase
            .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase()); // Capitalize first letter of each word
    };

    const submitPaymentForm = async (dataFormValues) => {
        setErrors({ ...errors, ledger_loading: true })
        const payment = await fetch("/api/transaction", {
            method: "POST",
            body: JSON.stringify({
                "amount": titleData[0].true_amount,
                "description": titleData[0].description,
                "bank_account_id": paymentFormData.values.bank_account_id,
                "transaction_id": paymentFormData.values.ledger_transaction_id
            })
        }).then(async (res) => {
            const a = await res.json()
            return a.data[0]
        })

        let updatedTransactions = transactions.map(transaction => {
            if (transaction.id === payment.id) {
                setLedger({
                    ...ledger,
                    balance: ledger.balance - titleData[0].true_amount
                })
                return payment;
            }
            return transaction;
        });
        setTransactions(updatedTransactions);
        // const { data, error } = await supabase.from('ledger_transactions').update({
        //     inflow: Math.abs(titleData[0].inflow)
        // }).match({"id": dataFormValues.ledger_transaction_id})

        // if (data) {

        //     await setTransactions(transactions)
        // }
        await setErrors({ ...errors, ledger_loading: false })
        close()
    }

    const transactionMessage = (inflow, outflow) =>
        inflow > 0 ?
            `$${Math.abs(inflow / 100).toFixed(2)} debited` :
            outflow < 0 ?
                `$${Math.abs(outflow / 100).toFixed(2)} credited` :
                'No transaction';

    return (
        <div>
            <Modal opened={modalOpen}
                title={titleData.length > 0 ? (<Text>{(titleData[0].true_amount < 0 ? "Pay" : "Collect")} <Text fw={700} span>${Math.abs(titleData[0].true_amount / 100).toFixed(2)}</Text> for <Text fw={700} span>{titleData[0].description}</Text>.</Text>) : <></>}
                onClose={close}>

                <form onSubmit={paymentFormData.onSubmit(submitPaymentForm)}>
                    {/* <TextInput mb={12} label="Pay from" placeholder="" {...form.getInputProps('email_address')} /> */}

                    <Radio.Group
                        size='md'
                        value={paymentFormData.values.bank_account_id}
                        onChange={(bank) => { paymentFormData.setFieldValue('bank_account_id', bank) }}
                        name="bankAccountSelect"
                        label={`Select which bank to ${(titleData.length > 0 ? (titleData[0].true_amount < 0 ? "charge" : "reimburse") : null)}`}
                        withAsterisk
                        mb={30}>
                        <Stack mt={8} gap={"xs"}>
                            {bankAccounts.length > 0 ? bankAccounts.map((item) => (
                                (<Radio key={item.id} value={item.id} disabled={item.ready != "ready"} label={`${item.description} (${(item.ready != "ready" ? "UNVERIFIED" : "..." + item.mask)})`} />)
                            )) : <div>
                                <Text>There are no banks connected. <Link href='payment-methods'><Text className='no-underline' span>Add one first.</Text></Link></Text>
                            </div>}

                        </Stack>
                    </Radio.Group>

                    {/* { (paymentFormData.values.balance_verify ? (<Text>We&apos;re verifying your bank balance</Text>) : (<> </>)) } */}

                    <Button type='submit'
                        {...(errors.ledger_loading ? { loading: true } : {})}
                    >Submit</Button>
                </form>

            </Modal>

            <Title order={3}>Billing center</Title>

            {regForm ? (<form onSubmit={regFormData.onSubmit((data) => { submitDataForm(data) })}>
                <Text mb={12}>We&apos;re missing some of your information.</Text>
                <Flex className='gap-4 mb-2'>
                    <TextInput size='md' label="First name" placeholder="" {...regFormData.getInputProps('first_name')} />
                    <TextInput size='md' label="Last name" placeholder="" {...regFormData.getInputProps('last_name')} />
                </Flex>

                <TextInput size='md' mb={12} label="Email" type="email" placeholder="" {...regFormData.getInputProps('email_address')} />


                <Button type="submit"
                    {...(errors.ledger_loading ? { loading: true } : {})}
                >Submit</Button>




            </form>) : (<></>)}

            {ledger ? <div>
                <Text size='lg' mb={12}>{
                    (ledger.balance >= 0 ? (ledger.balance == 0 ?
                        <Text>You don&apos;t owe any money</Text> :  // 0 
                        <Text>You have balance credit of ${Math.abs(ledger.balance / 100).toFixed(2)}</Text>) :  // credit
                        <Text>You owe ${Math.abs(ledger.balance / 100).toFixed(2)}</Text>) // debit
                }</Text>

                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Amount due</Table.Th>
                            <Table.Th>Due date</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {transactions.map((value) => {
                            return (
                                <Table.Tr key={value.id}>
                                    <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td>
                                    <Table.Td>{value.description}</Table.Td>
                                    <Table.Td>
                                        {value.true_amount !== 0 ? (
                                            <Button size='compact-sm' onClick={() => {
                                                paymentFormData.setFieldValue('ledger_transaction_id', value.id);
                                                open();
                                            }}>
                                                {value.true_amount < 0 ?
                                                    `Pay $${Math.abs(Number(value.true_amount) / 100).toFixed(2)}` :
                                                    `Collect $${(Number(value.true_amount) / 100).toFixed(2)}`}
                                            </Button>
                                        ) : (
                                            <Text size='sm'>{transactionMessage(value.inflow, value.outflow)}</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td> <Text size="sm">{new Date(value.due_date).toDateString()}</Text></Table.Td>

                                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                                </Table.Tr>
                            )
                        })}
                    </Table.Tbody>

                </Table>
                {
                    transactions.length == 0 ? <Text mt={50} fw={700} className='text-center'>You have no transactions yet</Text> : <></>
                }
            </div> : <></>}
            {(errors.ledger_loading && !regForm) ? (<Skeleton height={"200px"} width={"100%"} />) : <></>}
        </div>
    );
}
