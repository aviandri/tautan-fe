import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { OrderDetail } from "@/components/orders/OrderDetail";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-7">
      <Link href="/dashboard/orders" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Orders
      </Link>
      <div className="rounded-[28px] bg-surface p-[22px] shadow-card">
        <OrderDetail id={id} />
      </div>
    </div>
  );
}
