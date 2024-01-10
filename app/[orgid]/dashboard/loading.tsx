import { LoadingOverlay } from "@mantine/core";


export default function Loading() {

    return (<>
        <LoadingOverlay
            visible
            w={'100%'}
            h={'100%'}
        />
    </>)
}