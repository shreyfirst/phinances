'use client'
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Input, Table, Button, Modal, Text, TextInput, Skeleton, Radio, Title, Combobox, InputBase, useCombobox, Stack, Flex } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { title } from 'process';

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
            balance_verify: false
        },
        validate: {
            ledger_transaction_id: isNotEmpty(),
            bank_account_id: isNotEmpty(),
            balance_verify: isNotEmpty()
        },
    });
    const [ledger, setLedger] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [bankAccounts, setBankAccounts] = useState([])
    const bank_select = useCombobox({
        onDropdownClose: () => bank_select.resetSelectedOption(),
    });

    const titleData = transactions.filter((transaction)=>{
        if (transaction.id == paymentFormData.values.ledger_transaction_id){
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
    }, [])

    useEffect(() => {
        const user_transactions = supabase.from('ledger_transactions').select().then(async (res) => {
            setTransactions(res.data)
        })
        const bank_acounts = supabase.from('bank_accounts').select('*').then((res) => {
            setBankAccounts(res.data)
        })
    }, [])

    useEffect(() => {

        console.log("verified")

    }, [paymentFormData.values.balance_verify])

    const submitDataForm = async (dataFormValues) => {
        setErrors({ ...errors, ledger_loading: true })
        const { data, error } = await supabase.from('ledger_accounts').insert(dataFormValues).select()
        console.log(data, error)

        if (data) {
            await setLedger(data[0])
        }
        await setErrors({ ...errors, ledger_loading: false })
        regFormHandler.close()

    }

    return (
        <div>
            <Modal opened={modalOpen}
                title={titleData.length > 0 ? (<Text>Pay <Text fw={700} span>${Math.abs(titleData[0].debit_amount / 100).toFixed(2)}</Text> for <Text fw={700} span>{titleData[0].description}</Text>.</Text>) : <></>}
                onClose={close}>

                <form onSubmit={paymentFormData.onSubmit((data) => { submitDataForm(data) })}>
                    {/* <TextInput mb={12} label="Pay from" placeholder="" {...form.getInputProps('email_address')} /> */}

                    <Radio.Group
                        value={paymentFormData.values.bank_account_id}
                        onChange={(bank) => { paymentFormData.setFieldValue('bank_account_id', bank) }}
                        name="bankAccountSelect"
                        label="Select which bank to charge"
                        withAsterisk
                        mb={30}
                    >
                        <Stack mt={8} gap={"xs"}>
                            {bankAccounts.map((item) => (
                                <Radio key={item.id} value={item.id} label={`${item.description} (...${item.mask})`} />
                            ))}
                        </Stack>
                    </Radio.Group>

                    { (paymentFormData.values.balance_verify ? (<Text>We&apos;re verifying your bank balance</Text>) : (<> </>)) }



                    <Button onClick={()=>paymentFormData.setFieldValue('balance_verify', true)}
                        {...(errors.ledger_loading ? { loading: true } : {})}
                    >Continue</Button>
                </form>

            </Modal>

            <Title order={3}>Manage your account</Title>

            {regForm ? (<form onSubmit={regFormData.onSubmit((data) => { submitDataForm(data) })}>
                <Text mb={12}>We&apos;re missing some of your information.</Text>
                <div className='flex gap-4 mb-2'>
                    <TextInput label="First name" placeholder="" {...regFormData.getInputProps('first_name')} />
                    <TextInput label="Last name" placeholder="" {...regFormData.getInputProps('last_name')} />
                </div>
                <TextInput mb={12} label="Email" type="email" placeholder="" {...regFormData.getInputProps('email_address')} />
                <Button type="submit"
                    {...(errors.ledger_loading ? { loading: true } : {})}
                >Submit</Button>
            </form>) : (<></>)}

            {ledger ? <div>
                <Text size='lg' mb={12}>{
                    (ledger.balance >= 0 ? (ledger.balance == 0 ?
                        <Text>balance is 0</Text> :  // 0 
                        <Text> You have balance credit of ${(Number(ledger.balance) / 100).toFixed(2)}</Text>) :  // credit
                        <Text>You owe ${ledger.balance}</Text>) // debit
                }</Text>

                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Amount due</Table.Th>
                            <Table.Th>Amount paid</Table.Th>
                            <Table.Th>Status</Table.Th>
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
                                            Number(value.debit_amount) !== 0 ?
                                                `$${Math.abs(Number(value.debit_amount) / 100).toFixed(2)} debited` :
                                                `$${Math.abs(Number(value.credit_amount) / 100).toFixed(2)} credited`
                                        )}
                                    </Table.Td>
                                    <Table.Td>complete</Table.Td>

                                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                                </Table.Tr>
                            )
                        })}
                    </Table.Tbody>
                </Table>
            </div> : <></>}
            {(errors.ledger_loading && !regForm) ? (<Skeleton height={"200px"} width={"100%"} />) : <></>}
        </div>
    );
}
