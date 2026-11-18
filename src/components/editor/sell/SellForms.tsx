"use client";

/** Editor forms for the P3-A Sell cards. Errors are keyed by dotted path (sell-meta.ts). */
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, cx, Field, IconButton, Input } from "@/components/ui";
import { ctaTargets } from "@/lib/announcement";
import { assetUrl } from "@/lib/api";
import { DEFAULT_PRODUCT_WA, emptyShopItem, LIMITS } from "@/lib/editor/sell-meta";
import { useEditorData } from "@/lib/editor/queries";
import { getMeta, type FieldErrors } from "@/lib/editor/block-meta";
import { formatMoney, type Currency } from "@/lib/sell/money";
import { COURIER_LABELS, detectMarketplace, detectTipPlatform, MARKETPLACES, TIPS } from "@/lib/sell/platforms";
import type { BlockDataMap, MarketplacePlatform, ProductAction, ProductData, ShopItem } from "@/lib/types";
import { COURIERS, MARKETPLACE_PLATFORMS, PRODUCT_BADGES, TIP_PLATFORMS, WA_ORDER_FIELDS } from "@/lib/constants";
import { ImageField, ItemsEditor, TextField, UrlField } from "../fields";
import { FileUploadField, MoreOptions, Segmented, ToggleRow } from "../fields-extra";
import { CheckoutHint } from "./CheckoutHint";
import type { FormProps } from "../BlockForm";
import { HoursEditor, sortHours, TzSelect } from "./HoursEditor";
import { ChipsInput, CurrencySelect, Mark, MoneyField, MultiImageField, PhoneField, selectCls, StarsInput, ToggleChips } from "./sell-fields";

type WaItem = NonNullable<NonNullable<BlockDataMap["whatsapp"]["order_form"]>["items"]>[number];
type PriceItem = BlockDataMap["price_list"]["sections"][number]["items"][number];
type ReviewItem = BlockDataMap["reviews"]["items"][number];

/** Errors under `prefix.` with the prefix removed. */
function sub(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(errors)) if (k.startsWith(`${prefix}.`)) out[k.slice(prefix.length + 1)] = v;
  return out;
}

const BADGE_LABEL: Record<(typeof PRODUCT_BADGES)[number], string> = { new: "New", best_seller: "Best seller", pre_order: "Pre-order", sold_out: "Sold out" };

/** Placeholder chips that insert into a template textarea. */
function PlaceholderHint({ names, onInsert }: { names: string[]; onInsert: (p: string) => void }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      Insert:
      {names.map((n) => (
        <button key={n} type="button" onClick={() => onInsert(`{${n}}`)} className="rounded-md bg-black/[.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground hover:bg-black/10">
          {`{${n}}`}
        </button>
      ))}
    </span>
  );
}

// ---------- product ----------


function BuyAction({ value, onChange, errors, currency, inShop }: { value: ProductAction; onChange: (a: ProductAction) => void; errors: FieldErrors; currency?: string; inShop?: boolean }) {
  const set = (p: Partial<ProductAction>) => onChange({ ...value, ...p });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3.5">
      <Segmented<ProductAction["kind"]>
        label="Buy button"
        value={value.kind}
        size="sm"
        onChange={(kind) => onChange({ ...value, kind, ...(kind === "whatsapp" && !value.wa_template ? { wa_template: DEFAULT_PRODUCT_WA } : {}) })}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "marketplace", label: "Marketplace" },
          { value: "url", label: "Link" },
          { value: "checkout", label: "Checkout", title: "Visitors pay online, then download a file" },
        ]}
      />
      {value.kind === "checkout" && inShop && (
        <Segmented<"download" | "ship">
          label="Buyers get"
          size="sm"
          value={value.delivery === "ship" ? "ship" : "download"}
          onChange={(d) => set({ delivery: d === "ship" ? "ship" : undefined })}
          options={[
            { value: "download", label: "A file", title: "A private download link after paying" },
            { value: "ship", label: "A shipped item", title: "Buyers add it to a cart and give a shipping address" },
          ]}
        />
      )}
      {value.kind === "checkout" && value.delivery === "ship" && inShop && (
        <>
          <p className="text-[13px] text-muted">
            Buyers can add it to a cart with other products, choose how many, and enter a shipping address. You&apos;ll see the address in Orders, where you mark it shipped.
          </p>
          <CheckoutHint currency={currency ?? "IDR"} ships />
        </>
      )}
      {errors.delivery && <p className="text-[13px] text-danger">{errors.delivery}</p>}
      {value.kind === "checkout" && !(value.delivery === "ship" && inShop) && (
        <>
          <FileUploadField
            label="File buyers get"
            kind="private"
            value={{ url: value.download?.url ?? "", file_name: value.download?.file_name }}
            error={errors["download.url"]}
            onUploaded={(r) => set({ download: { url: r.url, ...(r.file_name ? { file_name: r.file_name } : {}) } })}
          />
          <CheckoutHint currency={currency ?? "IDR"} fileUrl={value.download?.url} />
        </>
      )}
      {value.kind === "whatsapp" && (
        <>
          <PhoneField value={value.wa_number} onChange={(wa_number) => set({ wa_number })} error={errors.wa_number} />
          <TextField
            label="Message"
            multiline
            value={value.wa_template ?? ""}
            onChange={(wa_template) => set({ wa_template })}
            maxLength={500}
            error={errors.wa_template}
            hint={<PlaceholderHint names={["name", "variant", "price"]} onInsert={(p) => set({ wa_template: `${value.wa_template ?? ""}${p}` })} />}
          />
        </>
      )}
      {value.kind === "marketplace" && (
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <MarketplaceSelect value={value.marketplace} onChange={(marketplace) => set({ marketplace })} error={errors.marketplace} />
          <UrlField
            label="Product link"
            value={value.url ?? ""}
            onChange={(url) => {
              const found = detectMarketplace(url);
              set({ url, ...(found && !value.marketplace ? { marketplace: found } : {}) });
            }}
            placeholder={value.marketplace ? MARKETPLACES[value.marketplace].example : "https://"}
            error={errors.url}
          />
        </div>
      )}
      {value.kind === "url" && <UrlField label="Link" value={value.url ?? ""} onChange={(url) => set({ url })} error={errors.url} />}
      <TextField
        label="Button text (optional)"
        value={value.label ?? ""}
        onChange={(label) => set({ label })}
        maxLength={40}
        error={errors.label}
        placeholder={value.kind === "whatsapp" ? "Order on WhatsApp" : value.kind === "marketplace" && value.marketplace ? `Buy on ${MARKETPLACES[value.marketplace].label}` : value.kind === "checkout" ? "Buy now" : "Buy"}
      />
    </div>
  );
}

function MarketplaceSelect({ value, onChange, error, taken = [] }: { value?: MarketplacePlatform; onChange: (p: MarketplacePlatform) => void; error?: string; taken?: string[] }) {
  return (
    <Field label="Marketplace" error={error}>
      {(p) => (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {value ? <Mark icon={MARKETPLACES[value].icon} label={MARKETPLACES[value].label} size={18} /> : null}
          </span>
          <select {...p} value={value ?? ""} onChange={(e) => onChange(e.target.value as MarketplacePlatform)} className={cx(selectCls, value && "pl-10")}>
            {!value && <option value="">Choose…</option>}
            {MARKETPLACE_PLATFORMS.map((m) => (
              <option key={m} value={m} disabled={taken.includes(m) && m !== value}>
                {MARKETPLACES[m].label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Field>
  );
}

function VariantsEditor({ value, onChange, errors }: { value: NonNullable<ProductData["variants"]>; onChange: (v: ProductData["variants"]) => void; errors: FieldErrors }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">Options</span>
      {value.length === 0 && <p className="text-[13px] text-muted">Sizes, flavours or colours visitors pick from.</p>}
      <ItemsEditor
        items={value}
        onChange={(v) => onChange(v.length ? v : undefined)}
        make={() => ({ name: value.length ? "" : "Size", options: [] })}
        addLabel="Add option group"
        max={LIMITS.variants}
        render={(it, update, i) => (
          <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
            <TextField label="Name" value={it.name} onChange={(name) => update({ name })} maxLength={30} placeholder="Size" error={errors[`variants.${i}.name`]} />
            <ChipsInput label="Choices" value={it.options} onChange={(options) => update({ options })} placeholder="S, M, L" max={LIMITS.variantOptions} error={errors[`variants.${i}.options`]} />
          </div>
        )}
      />
    </div>
  );
}

/** Fields shared by a product card and a shop item. */
function ProductFields<T extends Omit<ProductData, "schedule">>({
  data,
  onChange,
  errors,
  autoFocus,
  currency,
  inShop,
  children,
}: {
  data: T;
  onChange: (d: T) => void;
  errors: FieldErrors;
  autoFocus?: boolean;
  currency?: Currency;
  inShop?: boolean;
  children?: React.ReactNode;
}) {
  const set = (p: Partial<T>) => onChange({ ...data, ...p });
  return (
    <>
      <MultiImageField value={data.images} onChange={(images) => set({ images } as Partial<T>)} max={LIMITS.images} error={errors.images ?? Object.entries(errors).find(([k]) => k.startsWith("images."))?.[1]} />
      <TextField label="Product name" value={data.name} onChange={(name) => set({ name } as Partial<T>)} maxLength={100} autoFocus={autoFocus} placeholder="Fudgy brownies, 20×20" error={errors.name} />
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyField label="Price" value={data.price} currency={currency ?? data.currency} onChange={(price) => set({ price } as Partial<T>)} error={errors.price} />
        <MoneyField
          label="Was (optional)"
          value={data.compare_at}
          currency={currency ?? data.currency}
          onChange={(compare_at) => set({ compare_at } as Partial<T>)}
          error={errors.compare_at}
          hint="Shown struck through, for a sale"
        />
      </div>
      <Segmented<string>
        label="Badge"
        size="sm"
        value={data.badge ?? ""}
        onChange={(b) => set({ badge: (b || undefined) as T["badge"] } as Partial<T>)}
        options={[{ value: "", label: "None" }, ...PRODUCT_BADGES.map((b) => ({ value: b, label: BADGE_LABEL[b] }))]}
      />
      <BuyAction value={data.action} onChange={(action) => set({ action } as Partial<T>)} errors={sub(errors, "action")} currency={currency ?? data.currency} inShop={inShop} />
      <MoreOptions title="Description, options and stock" badge={data.description || data.variants?.length || data.stock_note ? <span className="size-1.5 rounded-full bg-brand" /> : undefined} defaultOpen={Object.keys(errors).some((k) => /^(description|variants|stock_note)/.test(k))}>
        <TextField label="Description" multiline value={data.description ?? ""} onChange={(description) => set({ description } as Partial<T>)} maxLength={1000} error={errors.description} />
        <VariantsEditor value={data.variants ?? []} onChange={(variants) => set({ variants } as Partial<T>)} errors={errors} />
        <TextField label="Stock note" value={data.stock_note ?? ""} onChange={(stock_note) => set({ stock_note } as Partial<T>)} maxLength={60} placeholder="12 left · Ships in 3 days" error={errors.stock_note} />
        {children}
      </MoreOptions>
    </>
  );
}

export function ProductForm({ data, onChange, errors, autoFocus }: FormProps<"product">) {
  return (
    <ProductFields data={data} onChange={onChange} errors={errors} autoFocus={autoFocus}>
      <CurrencySelect value={data.currency} onChange={(currency) => onChange({ ...data, currency })} />
    </ProductFields>
  );
}

// ---------- shop ----------

export function ShopForm({ data, onChange, errors, autoFocus }: FormProps<"shop">) {
  const [open, setOpen] = useState<string | null>(() => (data.items.length === 0 ? null : null));
  const set = (p: Partial<BlockDataMap["shop"]>) => onChange({ ...data, ...p });
  const categories = data.categories ?? [];
  const items = data.items;
  const setItem = (i: number, it: ShopItem) => set({ items: items.map((x, j) => (j === i ? it : x)) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set({ items: next });
  };
  const add = () => {
    const it = emptyShopItem(items.map((x) => x.id));
    set({ items: [...items, it] });
    setOpen(it.id);
  };
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={100} placeholder="Shop" autoFocus={autoFocus} error={errors.title} />
      <ChipsInput
        label="Categories (optional)"
        value={categories}
        onChange={(c) => set({ categories: c.length ? c : undefined })}
        placeholder="Stickers, Prints"
        max={LIMITS.categories}
        error={errors.categories}
        hint="Visitors filter the grid by these."
      />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">
          Products <span className="text-muted">({items.length})</span>
        </span>
        {errors.items && <p className="text-[13px] text-danger">{errors.items}</p>}
        {items.map((it, i) => {
          const itemErrors = sub(errors, `items.${i}`);
          const bad = Object.keys(itemErrors).length > 0;
          const expanded = open === it.id || (bad && open === null);
          return (
            <div key={it.id} className={cx("rounded-xl border bg-background/60", bad ? "border-danger/50" : "border-line")}>
              <div className="flex items-center gap-2 p-2 pr-1">
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? "" : it.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left">
                  {it.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(it.images[0])} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="size-10 shrink-0 rounded-lg bg-black/[.06]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{it.name || "New product"}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {[it.price != null && !Number.isNaN(it.price) ? formatMoney(it.price, data.items[0]?.currency) : "", it.category].filter(Boolean).join(" · ") || (bad ? "Needs details" : "No price")}
                    </span>
                  </span>
                  <ChevronDown className={cx("size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
                </button>
                <div className="flex shrink-0">
                  {i > 0 && (
                    <IconButton label={`Move ${it.name || "product"} up`} onClick={() => move(i, -1)}>
                      <span aria-hidden>↑</span>
                    </IconButton>
                  )}
                  {i < items.length - 1 && (
                    <IconButton label={`Move ${it.name || "product"} down`} onClick={() => move(i, 1)}>
                      <span aria-hidden>↓</span>
                    </IconButton>
                  )}
                  <IconButton label={`Remove ${it.name || "product"}`} onClick={() => set({ items: items.filter((_, j) => j !== i) })}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </div>
              {expanded && (
                <div className="flex flex-col gap-4 border-t border-line p-3">
                  <ProductFields data={it} onChange={(next) => setItem(i, next)} errors={itemErrors} autoFocus={!it.name} inShop />
                  {categories.length > 0 && (
                    <Field label="Category">
                      {(p) => (
                        <select {...p} value={it.category ?? ""} onChange={(e) => setItem(i, { ...it, category: e.target.value || undefined })} className={selectCls}>
                          <option value="">None</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {items.length < LIMITS.shopItems && (
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={add}>
            <Plus className="size-3.5" /> Add product
          </Button>
        )}
      </div>
      {items.some((it) => it.action.kind === "checkout" && it.action.delivery === "ship") && (
        <MoneyField
          label="Shipping fee"
          value={data.shipping_fee}
          currency={(items.find((it) => it.action.kind === "checkout")?.currency as Currency | undefined) ?? "IDR"}
          onChange={(shipping_fee) => set({ shipping_fee })}
          error={errors.shipping_fee}
          placeholder="Free"
          hint="Added once per order when the cart has something to ship. Leave it empty for free shipping."
        />
      )}
    </>
  );
}

// ---------- marketplace ----------

export function MarketplaceForm({ data, onChange, errors, autoFocus }: FormProps<"marketplace">) {
  const used = data.stores.map((s) => s.platform);
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => onChange({ ...data, title })} maxLength={60} placeholder="Also on" error={errors.title} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Stores</span>
        {errors.stores && <p className="text-[13px] text-danger">{errors.stores}</p>}
        <ItemsEditor
          items={data.stores}
          onChange={(stores) => onChange({ ...data, stores })}
          make={() => ({ platform: MARKETPLACE_PLATFORMS.find((p) => !used.includes(p)) ?? "shopee", url: "" })}
          addLabel="Add store"
          max={LIMITS.stores}
          render={(it, update, i) => (
            <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
              <MarketplaceSelect value={it.platform} onChange={(platform) => update({ platform })} taken={used} error={errors[`stores.${i}.platform`]} />
              <UrlField
                label="Store link"
                value={it.url}
                autoFocus={autoFocus && i === data.stores.length - 1}
                onChange={(url) => {
                  const found = detectMarketplace(url);
                  update({ url, ...(found && found !== it.platform && !used.includes(found) ? { platform: found } : {}) });
                }}
                placeholder={MARKETPLACES[it.platform]?.example}
                error={errors[`stores.${i}.url`]}
              />
            </div>
          )}
        />
      </div>
    </>
  );
}

// ---------- whatsapp ----------

const ORDER_TEMPLATE = "Hi! I'd like to order:\n{items}\n\nName: {name}\nAddress: {address}";
const FIELD_LABEL: Record<(typeof WA_ORDER_FIELDS)[number], string> = { items: "Items and quantity", name: "Name", address: "Delivery address", note: "Note" };

export function WhatsAppForm({ data, onChange, errors, autoFocus }: FormProps<"whatsapp">) {
  const set = (p: Partial<BlockDataMap["whatsapp"]>) => onChange({ ...data, ...p });
  const form = data.order_form;
  const setForm = (p: Partial<NonNullable<typeof form>>) => set({ order_form: { fields: [], ...form, ...p } });
  const placeholders = form ? ["items", "name", "address", "note", "total"].filter((p) => p === "total" ? form.fields.includes("items") : form.fields.includes(p as never)) : [];
  return (
    <>
      <Segmented<"chat" | "order">
        label="Type"
        value={form ? "order" : "chat"}
        onChange={(m) =>
          m === "order"
            ? set({ order_form: { fields: ["items", "name", "address"], items: [{ name: "" }] }, message_template: data.message_template.includes("{items}") ? data.message_template : ORDER_TEMPLATE, label: data.label === "Chat on WhatsApp" ? "Order on WhatsApp" : data.label })
            : set({ order_form: undefined })
        }
        options={[
          { value: "chat", label: "Chat button" },
          { value: "order", label: "Order form" },
        ]}
      />
      <TextField label="Button text" value={data.label} onChange={(label) => set({ label })} maxLength={40} error={errors.label} autoFocus={autoFocus} />
      <PhoneField value={data.number} onChange={(number) => set({ number })} error={errors.number} />
      {form && (
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3.5">
          <ToggleChips
            label="Visitors fill in"
            options={WA_ORDER_FIELDS.map((f) => ({ value: f, label: FIELD_LABEL[f] }))}
            value={form.fields}
            onChange={(fields) => setForm({ fields: WA_ORDER_FIELDS.filter((f) => fields.includes(f)) })}
          />
          {errors["order_form.fields"] && <p className="text-[13px] text-danger">{errors["order_form.fields"]}</p>}
          {form.fields.includes("items") && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Menu</span>
              {errors["order_form.items"] && <p className="text-[13px] text-danger">{errors["order_form.items"]}</p>}
              <ItemsEditor
                items={form.items ?? []}
                onChange={(items) => setForm({ items })}
                make={(): WaItem => ({ name: "" })}
                addLabel="Add item"
                max={LIMITS.waItems}
                render={(it, update, i) => (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <TextField label="Item" value={it.name} onChange={(name) => update({ name })} maxLength={80} placeholder="Brownies, 1 box" error={errors[`order_form.items.${i}.name`]} />
                    <MoneyField label="Price (optional)" value={it.price} currency={form.currency} onChange={(price) => update({ price })} error={errors[`order_form.items.${i}.price`]} compact />
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}
      <TextField
        label="Message"
        multiline
        value={data.message_template}
        onChange={(message_template) => set({ message_template })}
        maxLength={1000}
        error={errors.message_template}
        hint={
          form ? (
            <span className="flex flex-col gap-1">
              <PlaceholderHint names={placeholders} onInsert={(p) => set({ message_template: `${data.message_template}${p}` })} />
              <span>{"{items}"} becomes one line per item, like “2× Brownies (Rp 170.000)”. {"{total}"} is filled when every item has a price.</span>
            </span>
          ) : (
            "Prefilled in WhatsApp. Visitors can edit it before sending."
          )
        }
      />
      {form && (
        <MoreOptions title="Currency">
          <CurrencySelect value={form.currency} onChange={(currency) => setForm({ currency })} />
        </MoreOptions>
      )}
    </>
  );
}

// ---------- price list ----------

export function PriceListForm({ data, onChange, errors, autoFocus }: FormProps<"price_list">) {
  const set = (p: Partial<BlockDataMap["price_list"]>) => onChange({ ...data, ...p });
  const ask = data.ask;
  return (
    <>
      {errors.sections && <p className="text-[13px] text-danger">{errors.sections}</p>}
      <ItemsEditor
        items={data.sections}
        onChange={(sections) => set({ sections })}
        make={(): BlockDataMap["price_list"]["sections"][number] => ({ title: "", items: [{ name: "" }] })}
        addLabel="Add section"
        max={LIMITS.sections}
        render={(sec, update, i) => (
          <div className="flex flex-col gap-3">
            <TextField label={data.sections.length > 1 ? "Section title" : "Section title (optional)"} value={sec.title} onChange={(title) => update({ title })} maxLength={60} placeholder="Portraits" error={errors[`sections.${i}.title`]} />
            {errors[`sections.${i}.items`] && <p className="text-[13px] text-danger">{errors[`sections.${i}.items`]}</p>}
            <ItemsEditor
              items={sec.items}
              onChange={(items) => update({ items })}
              make={(): PriceItem => ({ name: "" })}
              addLabel="Add item"
              max={LIMITS.sectionItems}
              render={(it, upd, j) => {
                const p = `sections.${i}.items.${j}`;
                return (
                  <div className="flex flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                      <TextField label="Item" value={it.name} onChange={(name) => upd({ name })} maxLength={80} placeholder="Head and shoulders" autoFocus={autoFocus && i === 0 && j === 0} error={errors[`${p}.name`]} />
                      <MoneyField label="Price" value={it.price} currency={data.currency} onChange={(price) => upd({ price })} error={errors[`${p}.price`]} compact />
                    </div>
                    <TextField label="Description (optional)" value={it.desc ?? ""} onChange={(desc) => upd({ desc })} maxLength={200} error={errors[`${p}.desc`]} />
                    <label className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={!!it.price_from} onChange={(e) => upd({ price_from: e.target.checked || undefined })} className="size-4 accent-[var(--accent)]" />
                      Show as “from” price
                    </label>
                    <ImageField label="Photo (optional)" shape="square" allowUrl={false} value={it.image_url} onChange={(image_url) => upd({ image_url })} error={errors[`${p}.image_url`]} />
                  </div>
                );
              }}
            />
          </div>
        )}
      />
      <TextField label="Note (optional)" multiline value={data.note ?? ""} onChange={(note) => set({ note })} maxLength={300} placeholder="Prices include one round of changes." error={errors.note} />
      <ToggleRow
        label="Ask button"
        hint="A button under the list for questions or bookings."
        checked={!!ask}
        onChange={(on) => set({ ask: on ? { label: "Ask on WhatsApp", kind: "whatsapp", target: "" } : undefined })}
      />
      {ask && (
        <TargetFields
          value={ask}
          onChange={(a) => set({ ask: { ...a, label: a.label ?? "" } })}
          errors={sub(errors, "ask")}
          kinds={["whatsapp", "url"]}
          labelRequired
        />
      )}
      <MoreOptions title="Currency">
        <CurrencySelect value={data.currency} onChange={(currency) => set({ currency })} />
      </MoreOptions>
    </>
  );
}

/** The `{kind, target, label?}` shape shared by price_list.ask and payment.confirm. */
type Target = { kind: "whatsapp" | "url" | "form"; target: string; label?: string };

function TargetFields<T extends Target>({
  value,
  onChange,
  errors,
  kinds,
  labelRequired,
  labelPlaceholder,
}: {
  value: T;
  onChange: (v: T) => void;
  errors: FieldErrors;
  kinds: T["kind"][];
  labelRequired?: boolean;
  labelPlaceholder?: string;
}) {
  const editor = useEditorData();
  const forms = editor.data ? ctaTargets(editor.data.blocks) : [];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3.5">
      <Segmented<T["kind"]>
        label="Opens"
        size="sm"
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind, target: "" })}
        options={kinds.map((k) => ({ value: k, label: k === "whatsapp" ? "WhatsApp" : k === "url" ? "Link" : "Form" }))}
      />
      {value.kind === "whatsapp" && <PhoneField value={value.target} onChange={(target) => onChange({ ...value, target })} error={errors.target} />}
      {value.kind === "url" && <UrlField label="Link" value={value.target} onChange={(target) => onChange({ ...value, target })} error={errors.target} />}
      {value.kind === "form" && (
        <Field label="Form" error={errors.target} hint={forms.length ? "The button scrolls to this block." : "Add a form block to your page first."}>
          {(p) => (
            <select {...p} value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })} disabled={!forms.length} className={selectCls}>
              <option value="">Choose a form</option>
              {forms.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.data as { title?: string }).title || getMeta(b.type).label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <TextField
        label={labelRequired ? "Button text" : "Button text (optional)"}
        value={value.label ?? ""}
        onChange={(label) => onChange({ ...value, label })}
        maxLength={40}
        placeholder={labelPlaceholder}
        error={errors.label}
      />
    </div>
  );
}

// ---------- store info ----------

export function StoreInfoForm({ data, onChange, errors }: FormProps<"store_info">) {
  const set = (p: Partial<BlockDataMap["store_info"]>) => onChange({ ...data, ...p });
  return (
    <>
      <HoursEditor hours={data.hours} onChange={(hours) => set({ hours: sortHours(hours) })} errors={errors} />
      <TzSelect value={data.tz} onChange={(tz) => set({ tz })} error={errors.tz} />
      <TextField label="Street address (optional)" value={data.address ?? ""} onChange={(address) => set({ address })} maxLength={200} placeholder="Jl. Braga No. 12" error={errors.address} hint="Shown with a Directions link to Google Maps." />
      <TextField label="Area (optional)" value={data.area ?? ""} onChange={(area) => set({ area })} maxLength={100} placeholder="Sumur Bandung, Bandung" error={errors.area} />
      <ToggleChips
        label="Delivery"
        options={COURIERS.map((c) => ({ value: c, label: COURIER_LABELS[c] }))}
        value={data.couriers ?? []}
        onChange={(c) => set({ couriers: COURIERS.filter((x) => c.includes(x)) })}
      />
      <TextField label="Delivery note (optional)" multiline value={data.delivery_note ?? ""} onChange={(delivery_note) => set({ delivery_note })} maxLength={300} placeholder="Same-day delivery within Bandung for orders before 14:00." error={errors.delivery_note} />
    </>
  );
}

// ---------- payment ----------

const BANKS = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Jago", "SeaBank", "blu", "GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"];

export function PaymentForm({ data, onChange, errors, autoFocus }: FormProps<"payment">) {
  const set = (p: Partial<BlockDataMap["payment"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="How to pay" autoFocus={autoFocus} error={errors.title} />
      <ImageField label="QRIS code (optional)" shape="square" allowUrl={false} value={data.qris_image_url} onChange={(qris_image_url) => set({ qris_image_url })} error={errors.qris_image_url} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Bank and e-wallet accounts</span>
        {errors.accounts && <p className="text-[13px] text-danger">{errors.accounts}</p>}
        <datalist id="tautan-banks">
          {BANKS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <ItemsEditor
          items={data.accounts}
          onChange={(accounts) => set({ accounts })}
          make={() => ({ bank: "", name: "", number: "" })}
          addLabel="Add account"
          max={LIMITS.accounts}
          render={(a, update, i) => (
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Bank or e-wallet" error={errors[`accounts.${i}.bank`]}>
                {(p) => <Input {...p} list="tautan-banks" value={a.bank} maxLength={40} placeholder="BCA" onChange={(e) => update({ bank: e.target.value })} />}
              </Field>
              <TextField label="Account holder" value={a.name} onChange={(name) => update({ name })} maxLength={60} error={errors[`accounts.${i}.name`]} />
              <Field label="Number" error={errors[`accounts.${i}.number`]}>
                {(p) => <Input {...p} inputMode="numeric" value={a.number} maxLength={40} className="tabular-nums" onChange={(e) => update({ number: e.target.value })} />}
              </Field>
            </div>
          )}
        />
      </div>
      <TextField label="Note (optional)" multiline value={data.note ?? ""} onChange={(note) => set({ note })} maxLength={300} placeholder="Transfer the exact amount, then send us the receipt." error={errors.note} />
      <ToggleRow
        label="“I've paid” button"
        hint="Lets buyers send you their receipt."
        checked={!!data.confirm}
        onChange={(on) => set({ confirm: on ? { kind: "whatsapp", target: "" } : undefined })}
      />
      {data.confirm && (
        <TargetFields value={data.confirm} onChange={(confirm) => set({ confirm })} errors={sub(errors, "confirm")} kinds={["whatsapp", "url", "form"]} labelPlaceholder="Confirm payment" />
      )}
    </>
  );
}

// ---------- tip jar ----------

export function TipJarForm({ data, onChange, errors, autoFocus }: FormProps<"tip_jar">) {
  const set = (p: Partial<BlockDataMap["tip_jar"]>) => onChange({ ...data, ...p });
  const used = data.platforms.map((p) => p.platform);
  const amounts = data.amounts ?? [];
  return (
    <>
      <TextField label="Title" value={data.title} onChange={(title) => set({ title })} maxLength={100} autoFocus={autoFocus} error={errors.title} />
      <TextField label="Description (optional)" value={data.description ?? ""} onChange={(description) => set({ description })} maxLength={300} placeholder="Buy me a coffee for the next zine" error={errors.description} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Where to send support</span>
        {errors.platforms && <p className="text-[13px] text-danger">{errors.platforms}</p>}
        <ItemsEditor
          items={data.platforms}
          onChange={(platforms) => set({ platforms })}
          make={() => ({ platform: TIP_PLATFORMS.find((p) => !used.includes(p)) ?? "saweria", url: "" })}
          addLabel="Add platform"
          max={LIMITS.tipPlatforms}
          render={(it, update, i) => (
            <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
              <Field label="Platform" error={errors[`platforms.${i}.platform`]}>
                {(p) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <Mark icon={TIPS[it.platform].icon} label={TIPS[it.platform].label} size={18} />
                    </span>
                    <select {...p} value={it.platform} onChange={(e) => update({ platform: e.target.value as typeof it.platform })} className={cx(selectCls, "pl-10")}>
                      {TIP_PLATFORMS.map((t) => (
                        <option key={t} value={t} disabled={used.includes(t) && t !== it.platform}>
                          {TIPS[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </Field>
              <UrlField
                label="Link"
                value={it.url}
                onChange={(url) => {
                  const found = detectTipPlatform(url);
                  update({ url, ...(found && found !== it.platform && !used.includes(found) ? { platform: found } : {}) });
                }}
                placeholder={TIPS[it.platform].example}
                error={errors[`platforms.${i}.url`]}
              />
            </div>
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Suggested amounts (optional)</span>
        <p className="text-[12px] text-muted">Shown as chips. Visitors still pay on the platform.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) =>
            i <= amounts.length ? (
              <MoneyField
                key={i}
                label={`Amount ${i + 1}`}
                compact
                value={amounts[i]}
                currency={data.currency}
                error={errors[`amounts.${i}`]}
                onChange={(m) => {
                  const next = [...amounts];
                  if (m === undefined) next.splice(i, 1);
                  else next[i] = m;
                  set({ amounts: next.length ? next : undefined });
                }}
              />
            ) : null,
          )}
        </div>
      </div>
      <MoreOptions title="Currency">
        <CurrencySelect value={data.currency} onChange={(currency) => set({ currency })} />
      </MoreOptions>
    </>
  );
}

// ---------- reviews ----------

export function ReviewsForm({ data, onChange, errors, autoFocus }: FormProps<"reviews">) {
  const set = (p: Partial<BlockDataMap["reviews"]>) => onChange({ ...data, ...p });
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
  const dist = data.distribution ?? [0, 0, 0, 0, 0];
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Reviews" autoFocus={autoFocus} error={errors.title} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Average rating" error={errors.average} hint="0 to 5">
          {(p) => <Input {...p} inputMode="decimal" value={data.average ?? ""} placeholder="4.9" onChange={(e) => set({ average: num(e.target.value) })} />}
        </Field>
        <Field label="Number of reviews" error={errors.count}>
          {(p) => <Input {...p} inputMode="numeric" value={data.count ?? ""} placeholder="312" onChange={(e) => set({ count: num(e.target.value) })} />}
        </Field>
        <TextField label="From (optional)" value={data.source ?? ""} onChange={(source) => set({ source })} maxLength={40} placeholder="Shopee" error={errors.source} />
      </div>
      <MoreOptions title="Star breakdown (optional)">
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map((stars, i) => (
            <Field key={stars} label={`${stars}★`}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={dist[i] || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const next = [...dist];
                    next[i] = Math.max(0, Math.floor(Number(e.target.value.replace(/[^0-9]/g, "")) || 0));
                    set({ distribution: next });
                  }}
                />
              )}
            </Field>
          ))}
        </div>
        {errors.distribution && <p className="text-[13px] text-danger">{errors.distribution}</p>}
      </MoreOptions>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Reviews</span>
        {errors.items && <p className="text-[13px] text-danger">{errors.items}</p>}
        <ItemsEditor
          items={data.items}
          onChange={(items) => set({ items })}
          make={(): ReviewItem => ({ stars: 5, quote: "", author: "" })}
          addLabel="New review"
          max={LIMITS.reviews}
          render={(it, update, i) => (
            <div className="flex flex-col gap-2">
              <StarsInput value={it.stars} onChange={(stars) => update({ stars })} error={errors[`items.${i}.stars`]} />
              <TextField label="What they said" multiline value={it.quote} onChange={(quote) => update({ quote })} maxLength={500} error={errors[`items.${i}.quote`]} />
              <div className="grid gap-2 sm:grid-cols-2">
                <TextField label="Name" value={it.author} onChange={(author) => update({ author })} maxLength={60} placeholder="Rina" error={errors[`items.${i}.author`]} />
                <UrlField label="Link to the review (optional)" value={it.source_url ?? ""} onChange={(source_url) => update({ source_url })} error={errors[`items.${i}.source_url`]} />
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}
