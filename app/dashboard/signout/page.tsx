'use client';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignOut() {
    
    const supabase = createClientComponentClient()
    const router = useRouter()

    useEffect(()=>{
        supabase.auth.signOut()
        router.push('/')
    },[router])

    return (<div>/</div>)

}