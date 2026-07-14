import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SButton } from "./polaris";
import styles from "./offer-form/offer-form.module.css";

export type SelectedProduct = {
  id: string;
  title: string;
};

type ProductPickerFieldProps = {
  name?: string;
  initialProducts?: SelectedProduct[];
  required?: boolean;
  browseLabel?: string;
  emptyMessage?: string;
  productSubtext?: string;
  onProductsChange?: (count: number) => void;
};

export function ProductPickerField({
  name = "productIds",
  initialProducts = [],
  required = true,
  browseLabel = "Browse products",
  emptyMessage = "No products selected. Click browse to choose products for this offer.",
  productSubtext = "Included in offer",
  onProductsChange,
}: ProductPickerFieldProps) {
  const shopify = useAppBridge();
  const [products, setProducts] = useState<SelectedProduct[]>(initialProducts);
  const onProductsChangeRef = useRef(onProductsChange);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onProductsChangeRef.current = onProductsChange;
  }, [onProductsChange]);

  useEffect(() => {
    onProductsChangeRef.current?.(products.length);
  }, [products.length]);

  const hiddenValue = products.map((product) => product.id).join("\n");

  useEffect(() => {
    const input = hiddenInputRef.current;
    if (!input) return;

    if (input.value !== hiddenValue) {
      input.value = hiddenValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [hiddenValue]);

  const openPicker = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: products.map((product) => ({ id: product.id })),
    });

    if (!selected || selected.length === 0) return;

    setProducts(
      selected.map((item) => ({
        id: item.id,
        title: "title" in item && item.title ? String(item.title) : item.id,
      })),
    );
  }, [shopify, products]);

  const removeProduct = (id: string) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  return (
    <div>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={hiddenValue}
        required={required && products.length === 0}
      />

      <div className={styles.productToolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search products"
          readOnly
          onFocus={openPicker}
          aria-label="Search products"
        />
        <SButton type="button" variant="secondary" onClick={openPicker}>
          {browseLabel}
        </SButton>
      </div>

      {products.length === 0 ? (
        <p className={styles.emptyProducts}>{emptyMessage}</p>
      ) : (
        <ul className={styles.productList}>
          {products.map((product) => (
            <li key={product.id} className={styles.productRow}>
              <div className={styles.productThumb} aria-hidden="true">
                📦
              </div>
              <div className={styles.productMeta}>
                <p className={styles.productName}>{product.title}</p>
                <p className={styles.productSubtext}>{productSubtext}</p>
              </div>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeProduct(product.id)}
                aria-label={`Remove ${product.title}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
