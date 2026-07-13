import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useE2EMode } from "./E2EModeContext";
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
  onProductsChange?: (count: number) => void;
};

export function ProductPickerField(props: ProductPickerFieldProps) {
  const e2eMode = useE2EMode();
  if (e2eMode) {
    return <ProductPickerFieldLocal {...props} />;
  }
  return <ProductPickerFieldShopify {...props} />;
}

function ProductPickerFieldLocal({
  name = "productIds",
  initialProducts = [],
  required = true,
  browseLabel = "Browse products",
  onProductsChange,
}: ProductPickerFieldProps) {
  const [products, setProducts] = useState<SelectedProduct[]>(
    initialProducts.length > 0
      ? initialProducts
      : [
          {
            id: "gid://shopify/Product/1001",
            title: "E2E Sample Product",
          },
        ],
  );

  return (
    <ProductPickerUI
      name={name}
      products={products}
      setProducts={setProducts}
      required={required}
      browseLabel={browseLabel}
      onProductsChange={onProductsChange}
      onBrowse={() => {
        setProducts([
          {
            id: "gid://shopify/Product/1001",
            title: "E2E Sample Product",
          },
          {
            id: "gid://shopify/Product/1002",
            title: "E2E Sample Product 2",
          },
        ]);
      }}
    />
  );
}

function ProductPickerFieldShopify({
  name = "productIds",
  initialProducts = [],
  required = true,
  browseLabel = "Browse products",
  onProductsChange,
}: ProductPickerFieldProps) {
  const shopify = useAppBridge();
  const [products, setProducts] = useState<SelectedProduct[]>(initialProducts);

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

  return (
    <ProductPickerUI
      name={name}
      products={products}
      setProducts={setProducts}
      required={required}
      browseLabel={browseLabel}
      onProductsChange={onProductsChange}
      onBrowse={openPicker}
    />
  );
}

function ProductPickerUI({
  name,
  products,
  setProducts,
  required,
  browseLabel,
  onProductsChange,
  onBrowse,
}: {
  name: string;
  products: SelectedProduct[];
  setProducts: React.Dispatch<React.SetStateAction<SelectedProduct[]>>;
  required: boolean;
  browseLabel: string;
  onProductsChange?: (count: number) => void;
  onBrowse: () => void | Promise<void>;
}) {
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
          onFocus={() => {
            void onBrowse();
          }}
          aria-label="Search products"
        />
        <SButton
          type="button"
          variant="secondary"
          onClick={() => {
            void onBrowse();
          }}
        >
          {browseLabel}
        </SButton>
      </div>

      {products.length === 0 ? (
        <p className={styles.emptyProducts}>
          No products selected. Click browse to choose products for this offer.
        </p>
      ) : (
        <ul className={styles.productList}>
          {products.map((product) => (
            <li key={product.id} className={styles.productRow}>
              <div className={styles.productThumb} aria-hidden="true">
                📦
              </div>
              <div className={styles.productMeta}>
                <p className={styles.productName}>{product.title}</p>
                <p className={styles.productSubtext}>Included in offer</p>
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
