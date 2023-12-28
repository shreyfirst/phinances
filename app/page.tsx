'use client'
import React, { useRef, useState } from 'react';
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

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({
    "phoneNumber": false,
    "otp": false,
    "loading": false
  })
  const router = useRouter()

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

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErrors({ ...errors, loading: true });
    const { data, error } = await supabase.auth.verifyOtp({ phone: `1${phoneNumber.replace(/\D/g, '')}`, token: otp, type: "sms" });
    if (error) setErrors({ ...errors, otp: true, loading: false });
    else {
      router.push('/dashboard/overview')
      // setErrors({ ...errors, loading: false });
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">
        Phinances Portal
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Your central hub for everything money related for <br /><b>Phi Delta Theta: California Epsilon</b>
      </Text>

      <Paper withBorder shadow="md" p={30} my={30} radius="md">
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
            onChange={(e) => {
              setErrors({ ...errors, phoneNumber: false });
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
                length={6}
                placeholder="○"
                value={otp}
                onChange={(e) => {
                  setErrors({ ...errors, otp: false });
                  setOtp(e)
                }}
                oneTimeCode={true}
              />
            </InputWrapper>
          )}
          {!otpSent ? (
            <Button fullWidth mt="sm" type='submit' onClick={sendOtp}
              {...(errors.loading ? { loading: true } : {})}
            >
              Send OTP
            </Button>
          ) : (
            <Button fullWidth mt="sm" type='submit' onClick={verifyOtp}
              {...(errors.loading ? { loading: true } : {})}
            >
              Verify OTP
            </Button>
          )}
        </form>
    
        {/* <Link href="/signup"><Text size="xs" className={"text-center"} mt={16}>Don't have an account? <Text span c='blue'>Sign up here.</Text></Text></Link> */}

      </Paper>
    </Container >
  );
}
