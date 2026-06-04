"use client";

import { isCardPaymentMethod } from "@/lib/invoices/payment-links";
import { createPaymentInstruction } from "@/lib/invoices/defaults";
import type { PaymentInstruction } from "@/types/domain";

type PaymentMethodsEditorProps = {
  methods: PaymentInstruction[];
  onChange: (methods: PaymentInstruction[]) => void;
  addButtonLabel?: string;
  defaultLabel?: string;
  children?: React.ReactNode;
};

function updateAtIndex(
  methods: PaymentInstruction[],
  index: number,
  partial: Partial<PaymentInstruction>,
): PaymentInstruction[] {
  const next = [...methods];
  next[index] = { ...next[index], ...partial };
  return next;
}

function setPreferred(methods: PaymentInstruction[], id: string): PaymentInstruction[] {
  return methods.map((item) => ({ ...item, preferred: item.id === id }));
}

function removeById(methods: PaymentInstruction[], id: string): PaymentInstruction[] {
  return methods.filter((item) => item.id !== id);
}

export function PaymentMethodsEditor({
  methods,
  onChange,
  addButtonLabel = "Add method",
  defaultLabel = "Manual payment",
  children,
}: PaymentMethodsEditorProps) {
  function handleAdd() {
    onChange([...methods, createPaymentInstruction(defaultLabel)]);
  }

  function handleUpdate(index: number, partial: Partial<PaymentInstruction>) {
    onChange(updateAtIndex(methods, index, partial));
  }

  function handlePreferred(id: string) {
    onChange(setPreferred(methods, id));
  }

  function handleRemove(id: string) {
    onChange(removeById(methods, id));
  }

  return (
    <article className="card-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
        <h2 className="text-base font-semibold">Payments</h2>
        <button
          className="btn btn-secondary text-xs !py-1 !px-2 shadow-sm"
          onClick={handleAdd}
          type="button"
        >
          {addButtonLabel}
        </button>
      </div>
      <div className="p-5">
        {methods.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4 mb-4">
            No payment methods added.
          </p>
        ) : (
          <div className="space-y-4 mb-6">
            {methods.map((method, index) => {
              const isCardMethod = isCardPaymentMethod(method.label);
              const stripePaymentLink = method.stripePaymentLink ?? "";

              return (
                <div
                  className="p-4 rounded-md border border-[var(--border)] bg-[#fafbfb]"
                  key={method.id}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <input
                        className="field bg-white"
                        placeholder="Method label"
                        value={method.label}
                        onChange={(event) =>
                          handleUpdate(index, { label: event.target.value })
                        }
                      />
                      <input
                        className="field bg-white"
                        placeholder="Instructions"
                        value={method.details}
                        onChange={(event) =>
                          handleUpdate(index, { details: event.target.value })
                        }
                      />
                      {isCardMethod ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                              <label className="field-label">Stripe payment link</label>
                              <input
                                className="field bg-white"
                                inputMode="url"
                                placeholder="https://buy.stripe.com/..."
                                value={stripePaymentLink}
                                onChange={(event) =>
                                  handleUpdate(index, {
                                    stripePaymentLink: event.target.value,
                                  })
                                }
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] sm:pb-2">
                              <input
                                checked={Boolean(method.stripeQrEnabled)}
                                disabled={!stripePaymentLink.trim()}
                                onChange={(event) =>
                                  handleUpdate(index, {
                                    stripeQrEnabled: event.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              Show QR code
                            </label>
                          </div>
                          <p className="text-xs leading-5 text-[var(--muted)]">
                            QR codes are generated from the saved Stripe link at print time. The QR
                            asset is not stored in your database.
                          </p>
                        </>
                      ) : null}
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <input
                          checked={method.processingFeeEnabled}
                          onChange={(event) =>
                            handleUpdate(index, {
                              processingFeeEnabled: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        Add a processing fee on top for this payment method
                      </label>
                      {method.processingFeeEnabled ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="field-label">Fee percent</label>
                            <input
                              className="field bg-white"
                              min="0"
                              placeholder="2.9"
                              step="0.01"
                              type="number"
                              value={method.processingFeePercent}
                              onChange={(event) =>
                                handleUpdate(index, {
                                  processingFeePercent: Number(event.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="field-label">Flat fee</label>
                            <input
                              className="field bg-white"
                              min="0"
                              placeholder="0.30"
                              step="0.01"
                              type="number"
                              value={method.processingFeeFlatAmount}
                              onChange={(event) =>
                                handleUpdate(index, {
                                  processingFeeFlatAmount: Number(event.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className={`btn text-xs !py-1.5 ${method.preferred ? "btn-primary shadow-sm" : "btn-secondary shadow-sm"}`}
                        onClick={() => handlePreferred(method.id)}
                        type="button"
                      >
                        Preferred
                      </button>
                      <button
                        className="btn btn-secondary text-xs !py-1.5 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1] shadow-sm"
                        onClick={() => handleRemove(method.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {children}
      </div>
    </article>
  );
}
