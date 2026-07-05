import { useCallback, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export type SelectedProduct = {
  id: string;
  title: string;
};

type ProductPickerFieldProps = {
  name?: string;
  initialProducts?: SelectedProduct[];
  required?: boolean;
};

export function ProductPickerField({
  name = "productIds",
  initialProducts = [],
  required = true,
}: ProductPickerFieldProps) {
  const shopify = useAppBridge();
  const [products, setProducts] = useState<SelectedProduct[]>(initialProducts);

  const openPicker = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: products.map((p) => ({ id: p.id })),
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
    setProducts((current) => current.filter((p) => p.id !== id));
  };

  const hiddenValue = products.map((p) => p.id).join("\n");

  return (
    <div>
      <input type="hidden" name={name} value={hiddenValue} required={required && products.length === 0} />

      <s-stack direction="block" gap="base">
        <s-button type="button" variant="secondary" onClick={openPicker}>
          Select products
        </s-button>

        {products.length === 0 ? (
          <s-text tone="neutral">No products selected. Use the picker to choose products for this offer.</s-text>
        ) : (
          <s-stack direction="block" gap="base">
            {products.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-text>{product.title}</s-text>
                  <s-text tone="neutral">
                    <span
                      style={{
                        display: "inline-block",
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        verticalAlign: "bottom",
                      }}
                      title={product.id}
                    >
                      {product.id}
                    </span>
                  </s-text>
                  <s-button
                    type="button"
                    variant="tertiary"
                    onClick={() => removeProduct(product.id)}
                  >
                    Remove
                  </s-button>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-stack>
    </div>
  );
}
