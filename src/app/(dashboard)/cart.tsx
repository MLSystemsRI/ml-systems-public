import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import {
  useCart,
  removeFromCart,
  setCartQuantity,
  clearCart,
  cartSubtotalCents,
} from "@/lib/cart-store";
import { openCheckout } from "@/lib/checkout";
import { AppHeader } from "@/components/app-header";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";

const TEAL = "#14B8A6";
const BRIGHT = "#CCFBF1";

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/** Your Cart — Builder's Open House. Checkout opens the same hosted Stripe
 *  session the web store uses; the shared webhook writes the order. */
export default function CartScreen() {
  const router = useRouter();
  const items = useCart();
  const subtotal = cartSubtotalCents(items);

  const ordersQ = trpc.store.myOrders.useQuery(undefined, { retry: 0 });
  const baseline = useRef<number>(0);
  const [note, setNote] = useState<string | null>(null);

  const checkout = trpc.store.createCheckout.useMutation();

  const pay = useCallback(async () => {
    if (!items.length) return;
    setNote(null);
    baseline.current = ordersQ.data?.orders?.length ?? 0;
    try {
      const res: { url?: string } = await checkout.mutateAsync({
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          priceCents: i.priceCents,
          quantity: i.quantity,
        })),
      });
      if (!res?.url) {
        setNote("Checkout is unavailable right now.");
        return;
      }
      await openCheckout(res.url); // resolves when the browser is dismissed
      // Best-effort: if the webhook already recorded the order, clear the cart.
      const fresh = await ordersQ.refetch();
      const now = fresh.data?.orders?.length ?? 0;
      if (now > baseline.current) {
        clearCart();
        setNote("✓ Order placed — see it under Orders below.");
      } else {
        setNote("Payment sent — your order will appear under Orders shortly.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote(msg.includes("not configured") ? "Payments aren't switched on yet." : `Checkout failed — ${msg}`);
    }
  }, [items, checkout, ordersQ]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await ordersQ.refetch();
    setRefreshing(false);
  }, [ordersQ]);

  const orders = (ordersQ.data?.orders ?? []) as {
    id: string;
    orderNumber: string;
    totalCents: number;
    status: string;
  }[];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader href="/store" title="Your Cart" subtitle="Builder's Open House · .store" />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        {items.length === 0 ? (
          <View className="items-center mt-16">
            <Text style={{ fontSize: 34 }}>🛒</Text>
            <Text className="text-[#6B7280] text-[13px] mt-3 mb-4">Your cart is empty.</Text>
            <TouchableOpacity
              onPress={() => router.push("/store")}
              activeOpacity={0.85}
              className="rounded-xl px-4 py-2.5"
              style={{ backgroundColor: `${TEAL}1A`, borderWidth: 1, borderColor: `${TEAL}55` }}
            >
              <Text style={{ color: TEAL }} className="text-[12px] font-bold">Browse the marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="gap-2 mt-2 mb-4">
              {items.map((i) => (
                <View key={i.id} className="rounded-2xl p-3 flex-row items-center gap-3" style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}>
                  <View className="flex-1">
                    <Text className="text-[#F9FAFB] text-[12.5px] font-bold leading-snug" numberOfLines={2}>{i.title}</Text>
                    <Text style={{ color: TEAL }} className="text-[13px] font-extrabold mt-1">{fmt(i.priceCents)}</Text>
                  </View>
                  {/* Qty stepper */}
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => setCartQuantity(i.id, i.quantity - 1)}
                      activeOpacity={0.8}
                      className="rounded-lg w-7 h-7 items-center justify-center"
                      style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#262626" }}
                    >
                      <Text className="text-[#9CA3AF] text-[15px]">−</Text>
                    </TouchableOpacity>
                    <Text className="text-[#F9FAFB] text-[12px] font-bold w-6 text-center">{i.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => setCartQuantity(i.id, i.quantity + 1)}
                      activeOpacity={0.8}
                      className="rounded-lg w-7 h-7 items-center justify-center"
                      style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#262626" }}
                    >
                      <Text className="text-[#9CA3AF] text-[15px]">+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(i.id)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text className="text-[#4B5563] text-[13px]">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Subtotal + checkout — MIA's woven mirror */}
            <View className="rounded-2xl p-4 mb-3 overflow-hidden" style={{ backgroundColor: "#0d1513", borderWidth: 1, borderColor: `${TEAL}44` }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[#9CA3AF] text-[12px]">Subtotal</Text>
                <Text className="text-[#F9FAFB] text-[16px] font-extrabold">{fmt(subtotal)}</Text>
              </View>
              <TouchableOpacity
                onPress={pay}
                disabled={checkout.isPending}
                activeOpacity={0.85}
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: TEAL, opacity: checkout.isPending ? 0.6 : 1 }}
              >
                <Text style={{ color: "#04231D" }} className="text-[13px] font-extrabold">
                  {checkout.isPending ? "Opening checkout…" : "Checkout with Stripe"}
                </Text>
              </TouchableOpacity>
              <Text className="text-[#4B5563] text-[9.5px] text-center mt-2">Secure payment · pickup in Rhode Island</Text>
              <AuroraWeaveBorder color={TEAL} bright={BRIGHT} radius={16} both frame={false} idKey="cart-total" />
            </View>

            <TouchableOpacity onPress={() => clearCart()} activeOpacity={0.7} className="items-center mb-4">
              <Text className="text-[#4B5563] text-[11px]">Clear cart</Text>
            </TouchableOpacity>
          </>
        )}

        {note ? (
          <Text style={{ color: note.startsWith("✓") ? TEAL : "#9CA3AF" }} className="text-[11px] text-center mb-4">{note}</Text>
        ) : null}

        {/* Recent orders — confirmation once the webhook lands (pull to refresh) */}
        {orders.length ? (
          <View className="mt-2">
            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Your Orders</Text>
            <View className="gap-1.5">
              {orders.slice(0, 6).map((o) => (
                <View key={o.id} className="rounded-xl px-3.5 py-2.5 flex-row items-center" style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}>
                  <Text className="text-[#F9FAFB] text-[12px] font-semibold flex-1">{o.orderNumber}</Text>
                  <Text className="text-[#6B7280] text-[11px] mr-2">{fmt(o.totalCents)}</Text>
                  <Text style={{ color: o.status === "paid" ? "#22C55E" : "#F59E0B" }} className="text-[10px] font-bold uppercase">{o.status}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <CompartmentChrome href="/store" />
    </View>
  );
}
