import "./buy.css";

/** Payments (b): checkout, order and order-lookup pages. Server HTML only, no client JS of their own. */
export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <div className="tb">{children}</div>;
}
