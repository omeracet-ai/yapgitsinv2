import type { Metadata } from 'next';
import renderCustomerHome, { buildCustomerHomeMetadata } from '../../_locale_pages/musteri/index';

export function generateMetadata(): Metadata { return buildCustomerHomeMetadata('en'); }
export default function Page() { return renderCustomerHome('en'); }
