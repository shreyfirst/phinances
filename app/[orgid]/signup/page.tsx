'use client'
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, Paper, Title, Text, Container, Button, PinInput, InputLabel, InputWrapper } from '@mantine/core';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient()
function phoneFormat(input) {
  input = input.replace(/\D/g, '');
  var size = input.length;
  if (size > 0) { input = "(" + input }
  if (size > 3) { input = input.slice(0, 4) + ") " + input.slice(4, 11) }
  if (size > 6) { input = input.slice(0, 9) + "-" + input.slice(9) }
  return input;
}

export default function Login({ params }: { params: { orgid: string } }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [org, setOrg] = useState({});
  const [errors, setErrors] = useState({
    "phoneNumber": false,
    "otp": false,
    "loading": false,
    "noOrg": false
  })
  const router = useRouter()
  // router.prefetch('/dashboard/overview')

  const sendOtp = async (e) => {
    e.preventDefault();
    setErrors({ ...errors, loading: true });
    const { data, error } = await supabase.auth.signInWithOtp({ phone: `1${phoneNumber.replace(/\D/g, '')}` });
    if (error) setErrors({ ...errors, phoneNumber: true, loading: false });
    else {
      setOtpSent(true);
      setErrors({ ...errors, loading: false });
    }
  };

  useEffect(()=>{
    if (otpSent) {
      setOtpSent(false)
      setErrors({ ...errors, otp: false });
      setOtp('')
    }
  }, [phoneNumber])

  useEffect(()=>{
    supabase.from('orgs').select().eq('id', params.orgid).then((res)=>setOrg(res.data[0]))
  }, [params.orgid])

  useEffect(()=>{
    if (otp.length == 6 && !errors.otp) {
      verifyOtp()
    }
  }, [otp])

  const verifyOtp = async () => {
    setErrors({ ...errors, loading: true });
    const { data, error } = await supabase.auth.verifyOtp({ phone: `1${phoneNumber.replace(/\D/g, '')}`, token: otp, type: "sms" });
    if (error) setErrors({ ...errors, otp: true, loading: false });
    else {
      const current_orgs = data.user.app_metadata.org_member
      await supabase.rpc('add_user_to_org', {orgid: params.orgid})
      supabase.auth.refreshSession()
      router.push(`/${params.orgid}/dashboard/overview`)
    }
  };

  return (
    <Container size={420} my={40}>
        


      <Paper withBorder shadow="md" p={30} my={30} radius="md">
      <Text fw={700} c="dimmed" size="md" ta="center" mt={5}>
        You are registering for
      </Text>
      <Title ta="center" mb={20}>
        {(org['name'] ? (`${org['name']}`) : (null))}
      </Title>

        <form>
          <TextInput
            // ref={otp_ref}
            leftSection={
              <Text size='sm'>+1</Text>
            }
            label="Phone number"
            placeholder="(800) 273-8255"
            value={phoneNumber}
            type='tel'
            inputMode='tel'
            size='md'
            onChange={(e) => {
              setErrors({ ...errors, phoneNumber: false, noOrg: false });
              setPhoneNumber(phoneFormat(e.target.value))
          
            }}
            {...(errors.phoneNumber ? { error: 'This phone number is invalid' } : {})}
            required
            
          />
          {otpSent && (

            <InputWrapper
              label="Enter your verification code"
              required
              {...(errors.otp ? { error: "This one-time passcode is invalid" } : {})}
              mt='sm'>
                
              <PinInput
                autoFocus
                size='md'
                length={6}
                placeholder="○"
                value={otp}
                onChange={(e) => {
                  setErrors({ ...errors, otp: false });
                  setOtp(e)
                }}
                type={'number'}
                oneTimeCode={true}
                inputMode={'numeric'}
              />
            </InputWrapper>
          )}
          {!errors.noOrg ? (!otpSent ? (
            <Button fullWidth mt="sm" type='submit' onClick={sendOtp}
              {...(errors.loading ? { loading: true } : {})}
            >
              Send OTP
            </Button>
          ) : (
            <Button fullWidth mt="sm" type='submit' onClick={(e)=>{
              e.preventDefault()
              verifyOtp()
            }}
              {...(errors.loading ? { loading: true } : {})}
            >
              Verify OTP
            </Button>
          )) : <Text mt={20} className='text-center'>You do not have an active organization. <Text span fw={700}>Ask your treasurer for a signup link.</Text></Text>}
        </form>
    
        {/* <Link href="/signup"><Text size="xs" className={"text-center"} mt={16}>Don't have an account? <Text span c='blue'>Sign up here.</Text></Text></Link> */}

      </Paper>
    </Container >
  );
}
