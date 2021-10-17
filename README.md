# Storinka Vue

Vue 3 plugin for Storinka.

## Content

- [Installation](#Installation)
- [Usage](#Usage)
- [Options](#Options)
- [Properties](#Properties)
- [Functions](#Functions)
- [Types](#Types)

## Installation

```shell
yarn add @storinka/cafe-vue
```

## Usage

```javascript
// main.js
import { createApp } from "vue";
import { createStorinka } from "@storinka/cafe-vue";

const app = createApp();

const storinka = createStorinka({
    apiUrl: "https://api.storinka.menu",
});

app.use(storinka);
```

```vue
// App.vue

<template>
  <div class="app">
    <div v-if="$storinka.state.isLoading">
      Loading...
    </div>
    <div v-else>
      {{ $storinka.state.cafe.name }}
    </div>
  </div>
</template>

<script>
export default {
  created() {
    this.$storinka.setCafe("kava-gallery", "uk");
  }
}
</script>
```

## Options

### `apiUrl`:

- Type: `string | undefined`
- Default: `https://api.storinka.menu`

### `apiVersion`:

- Type: `string | undefined`
- Default: `3`

### `domain`:

- Type: `string | undefined`
- Examples: `localhost`, `storinka.menu`

Current domain.

### `domains`:

- Type: `string[] | undefined`

Additional Storinka's domains.

### `keepCart`:

- Type: `boolean | undefined`

Keep cart state in storage.

### `keepLanguage`:

- Type: `boolean | undefined`

Keep language in storage.

### `keepOrders`:

- Type: `boolean | undefined`

Keep orders in storage after checkout.

### `keepReviews`:

- Type: `boolean | undefined`

Keep reviews in storage.

### `loadSkinConfig`:

- Type: `boolean | undefined`

Load skin config after cafe was loaded.

### `imagePlaceholders`:

- Type: `StorinkaImagePlaceholdersOption | undefined`

Provide image placeholders.

### `analytics`:

- Type: `StorinkaAnalyticsOptions | undefined`

Analytics options.

## Properties

### `state`:

Current state which contains info about current cafe.

Properties:

- `cafe` - cafe object; type: `CafeResultV3 | undefined`.
- `id` - id by which the cafe was loaded; type: `string | undefined`;
- `isLoading` - is cafe currently loading; type: `boolean`;
- `language` - : current language; type: `string`;
- `skinConfig` - skin config; type: `any | undefined`;

### `cart`:

Cart state object. Type: `Cart`.

Check [https://github.com/storinka/cart](https://github.com/storinka/cart) for more info.

### `storage`:

Storage instance. Type: `StorinkaStorage`.

### `analytics`:

Analytics instance. Type: `StorinkaAnalytics`.

## Functions

### `invoke(name: string, params?: any)`

- Result: `Promise<any>`

Invoke a function.

### `setCafe(id: string, language: string)`

- Result: `Promise<CafeResultV3>`

Sets current cafe by id. Id can be **hash id**, **slug** or **domain**.
> If you are using a **domain** as id, you must add dollar sign (`$`) as prefix to it. Example: `$storinka.menu`.

### `setLanguage(language: string)`

- Result: `Promise<CafeResultV3>`

Sets language for current cafe.

### `loadSkinConfig()`

- Result: `Promise<any>`

Load skin config.

### Other functions:

```
getMenu(menuId: number | string): MenuResultV3 | undefined;

getCategory(categoryId: number | string): CategoryResultV3 | undefined;

getDish(dishId: number | string): DishResultV3 | undefined;

getDishByVariant(variantId: number): DishResultV3 | undefined;

getDishDefaultVariant(dishOrId: number | DishResultV3): DishVariantResultV3 | undefined;

getDishDiscount(dish: DishResultV3): DiscountResultV3 | null | undefined;

getVariant(variantId: number): DishVariantResultV3 | undefined;

getOption(optionId: number): OptionResultV3 | undefined;

getOptionByItem(optionItemId: number): OptionResultV3 | undefined;

getOptionItem(optionItemId: number): OptionItemResultV3 | undefined;

getTag(tagId: number | string): TagResultV3 | undefined;

getDiscount(discountId: number): DiscountResultV3 | undefined;

getAdvertisement(advertisementId: number | string): AdvertisementResultV3 | undefined;

getSet(setId: number): SetResultV3 | undefined;

getMenuCategories(menuOrId: number | MenuResultV3): CategoryResultV3[];

getCategoryDishes(categoryOrId: number | CategoryResultV3): DishResultV3[];

getDishTags(dishOrId: number | DishResultV3): TagResultV3[];


getAppPath(path: string): string;

getMenuPath(menu: MenuResultV3): string;

getCategoryPath(menu: MenuResultV3, category: CategoryResultV3): string;

getDishPath(menu: MenuResultV3, category: CategoryResultV3, dish: DishResultV3): string;


getItemProperId(item: ItemWithSlugOrHashId): string;

checkItemId(item: ItemWithSlugOrHashId, id: string | number): boolean;


getCartTotal(): number;

getCartTotalAfterDiscounts(): number;

getCartItems(): CartItem[];

makeCartItem(orderItem: OrderItemInputV3): CartItem;

isDishInCart(dish: DishResultV3): boolean;

checkDeliveryAddress(lat: number, lng: number): Promise<DeliveryZoneResultV2 | null>;

checkout(cleanItems: boolean = true): Promise<MadeOrderResultV2>;

getLocalOrders(): OrderResultV2[];


getBrowserLanguage(): string;

getSupportedLanguages(): Promise<SupportedLanguageV2[]>;

getPriceAfterDiscount(price: number, discount: DiscountResultV3): number;

isCustomDomain(domain?: string): boolean;


sendReview(params: SendReviewParams): Promise<ReviewResultV3>;


getDishImageUrl(dishOrId: DishResultV3 | number, size?: number): string;

getCategoryImageUrl(categoryOrId: CategoryResultV3 | number, size?: number): string;

getMenuImageUrl(menuOrId: MenuResultV3 | number, size?: number): string;

getSizedImageUrl(url: string, size?: number): string;
```

## Types

Types declarations are located here: [src/types.ts](src/types.ts)
