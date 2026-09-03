'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VerifyPrescriptionPage from '@/app/verify/[hash]/page';

export default function VerifyPrescriptionAliasPage() {
  const params = useParams();
  const router = useRouter();
  const rawHash = (params?.hash as string) || '';

  useEffect(() => {
    if (rawHash) {
      router.replace(`/verify/${encodeURIComponent(rawHash)}`);
    }
  }, [rawHash, router]);

  return <VerifyPrescriptionPage />;
}
