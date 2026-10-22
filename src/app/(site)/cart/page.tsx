import type { Metadata } from "next";
import Cart from "@/components/Cart";

export const metadata: Metadata = {
  title: "My Cart",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <Cart />;
}
