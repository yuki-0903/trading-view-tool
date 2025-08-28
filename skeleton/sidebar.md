# Navigation

Provides navigation interfaces for large, medium, and small screens.

## Rail

- Recommended for medium to large screens
- Ideal for horizontal screen layouts  
- Should be fixed to the left or right of the viewport
- Supports 3-7 tiles based on viewport height

### Selection

Define a `value` state on the Rail. This is updated to match each Tile `id` when pressed.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  // Icons
  import IconFolder from '@lucide/svelte/icons/folder';
  import IconImage from '@lucide/svelte/icons/image';
  import IconMusic from '@lucide/svelte/icons/music';
  import IconVideo from '@lucide/svelte/icons/video';

  // State
  let value = $state('files');
</script>

<div class="card border-surface-100-900 grid h-[640px] w-full grid-cols-[auto_1fr] border-[1px]">
  <!-- Component -->
  <Navigation.Rail {value} onValueChange={(newValue) => (value = newValue)}>
    {#snippet tiles()}
      <Navigation.Tile id="files" label="Files"><IconFolder /></Navigation.Tile>
      <Navigation.Tile id="images" label="Images"><IconImage /></Navigation.Tile>
      <Navigation.Tile id="music" label="Music"><IconMusic /></Navigation.Tile>
      <Navigation.Tile id="videos" label="Videos"><IconVideo /></Navigation.Tile>
    {/snippet}
  </Navigation.Rail>
  <!-- Content -->
  <div class="flex items-center justify-center">
    <pre class="pre">value: {value}</pre>
  </div>
</div>
```

### Routing

Replace Tile `id` with `href` to convert each to an anchor link.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  // Icons
  import IconMenu from '@lucide/svelte/icons/menu';
  import IconFolder from '@lucide/svelte/icons/folder';
  import IconImage from '@lucide/svelte/icons/image';
  import IconMusic from '@lucide/svelte/icons/music';
  import IconVideo from '@lucide/svelte/icons/video';
  import IconSettings from '@lucide/svelte/icons/settings';
</script>

<div class="card border-surface-100-900 grid h-[640px] w-full grid-cols-[auto_1fr] border-[1px]">
  <!-- Component -->
  <Navigation.Rail>
    {#snippet header()}
      <Navigation.Tile href="#" title="Menu"><IconMenu /></Navigation.Tile>
    {/snippet}
    {#snippet tiles()}
      <Navigation.Tile label="Files" href="#/files"><IconFolder /></Navigation.Tile>
      <Navigation.Tile label="Images" href="#/images"><IconImage /></Navigation.Tile>
      <Navigation.Tile label="Music" href="#/music"><IconMusic /></Navigation.Tile>
      <Navigation.Tile label="Videos" href="#/videos"><IconVideo /></Navigation.Tile>
    {/snippet}
    {#snippet footer()}
      <Navigation.Tile labelExpanded="Settings" href="#settings" title="settings"><IconSettings /></Navigation.Tile>
    {/snippet}
  </Navigation.Rail>
  <!-- Content -->
  <div class="flex items-center justify-center">
    <p class="opacity-20">(Content)</p>
  </div>
</div>
```

### Expanded

Apply the `expanded` property to enable an expanded mode. Each tile will resize and use the expanded label.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  // Icons
  import IconMenu from '@lucide/svelte/icons/menu';
  import IconFolder from '@lucide/svelte/icons/folder';
  import IconImage from '@lucide/svelte/icons/image';
  import IconMusic from '@lucide/svelte/icons/music';
  import IconVideo from '@lucide/svelte/icons/video';
  import IconGames from '@lucide/svelte/icons/gamepad';
  import IconSettings from '@lucide/svelte/icons/settings';

  let isExpansed = $state(true);

  function toggleExpanded() {
    isExpansed = !isExpansed;
  }
</script>

<div class="card border-surface-100-900 grid h-[760px] w-full grid-cols-[auto_1fr] border-[1px]">
  <!-- Component -->
  <Navigation.Rail expanded={isExpansed}>
    {#snippet header()}
      <Navigation.Tile labelExpanded="Menu" onclick={toggleExpanded} title="Toggle Menu Width"><IconMenu /></Navigation.Tile>
    {/snippet}
    {#snippet tiles()}
      <Navigation.Tile labelExpanded="Browse Files" href="#/files">
        <IconFolder />
      </Navigation.Tile>
      <Navigation.Tile labelExpanded="Browse Images" href="#/images">
        <IconImage />
      </Navigation.Tile>
      <Navigation.Tile labelExpanded="Browse Music" href="#/music">
        <IconMusic />
      </Navigation.Tile>
      <Navigation.Tile labelExpanded="Browse Videos" href="#/videos">
        <IconVideo />
      </Navigation.Tile>
      <Navigation.Tile labelExpanded="Browse Games" href="/games">
        <IconGames />
      </Navigation.Tile>
    {/snippet}
    {#snippet footer()}
      <Navigation.Tile labelExpanded="Settings" href="/settings" title="Settings"><IconSettings /></Navigation.Tile>
    {/snippet}
  </Navigation.Rail>
  <!-- Content -->
  <div class="flex items-center justify-center">
    <p class="opacity-20">(Content)</p>
  </div>
</div>
```

## Bar

- Recommended for small screens
- Ideal for vertical screen layouts
- Should be fixed to the bottom of the viewport
- Supports 3-5 tiles based on viewport width
- Consider progressive enhancement with the [Virtual Keyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)

### Selection

Define a `value` state on the Bar. This is updated to match each Tile `id` when pressed.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  // Icons
  import IconFolder from '@lucide/svelte/icons/folder';
  import IconImage from '@lucide/svelte/icons/image';
  import IconMusic from '@lucide/svelte/icons/music';
  import IconVideo from '@lucide/svelte/icons/video';

  // State
  let value = $state('files');
</script>

<div class="card border-surface-100-900 grid h-[512px] w-[320px] grid-rows-[1fr_auto] border-[1px]">
  <!-- Content -->
  <div class="flex items-center justify-center">
    <pre class="pre">value: {value}</pre>
  </div>
  <!-- Component -->
  <Navigation.Bar {value} onValueChange={(newValue) => (value = newValue)}>
    <Navigation.Tile id="files" label="Files"><IconFolder /></Navigation.Tile>
    <Navigation.Tile id="images" label="Images"><IconImage /></Navigation.Tile>
    <Navigation.Tile id="music" label="Music"><IconMusic /></Navigation.Tile>
    <Navigation.Tile id="videos" label="Videos"><IconVideo /></Navigation.Tile>
  </Navigation.Bar>
</div>
```

### Routing

Replace Tile `id` with `href` to convert each to an anchor link.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  // Icons
  import IconFolder from '@lucide/svelte/icons/folder';
  import IconImage from '@lucide/svelte/icons/image';
  import IconMusic from '@lucide/svelte/icons/music';
  import IconVideo from '@lucide/svelte/icons/video';
</script>

<div class="card border-surface-100-900 grid h-[512px] w-[320px] grid-rows-[1fr_auto] border-[1px]">
  <!-- Content -->
  <div class="flex items-center justify-center">
    <p class="opacity-20">(Content)</p>
  </div>
  <!-- Component -->
  <Navigation.Bar>
    <Navigation.Tile label="Files" href="#/files"><IconFolder /></Navigation.Tile>
    <Navigation.Tile label="Images" href="#/images"><IconImage /></Navigation.Tile>
    <Navigation.Tile label="Music" href="#/music"><IconMusic /></Navigation.Tile>
    <Navigation.Tile label="Videos" href="#/videos"><IconVideo /></Navigation.Tile>
  </Navigation.Bar>
</div>
```

## Tiles

Tiles are universal between Rails and Bars. They default to buttons, but will convert to anchors when an `href` is provided. When implementing `value` for selection, each item will update the value when clicked.

```svelte
<script lang="ts">
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  import IconBox from '@lucide/svelte/icons/box';
</script>

<div class="card preset-filled-surface-100-900 grid grid-cols-3 gap-5 p-5">
  <!-- By default tiles are <button> elements -->
  <Navigation.Tile id="0" label="Button">
    <IconBox />
  </Navigation.Tile>
  <!-- Add selected to button tiles to enable the active state -->
  <Navigation.Tile id="0" label="Button" selected>
    <IconBox />
  </Navigation.Tile>
  <!-- When adding an href, they are converted to anchors -->
  <Navigation.Tile label="Anchor" href="#">
    <IconBox />
  </Navigation.Tile>
</div>
```

### Anchor Tile Selection

When using anchor Tiles, use the `selected` prop to highlight the active tile. For SvelteKit, this can be achieved using the `page` state and comparing the page pathname and tile URLs.

```svelte
<script lang="ts">
  import { page } from '$app/state';

  const links = [
    { label: 'Files', href: '#/files' },
    { label: 'Images', href: '#/images' },
    { label: 'Music', href: '#/music' },
    { label: 'Videos', href: '#/videos' },
  ];
</script>

<Navigation.Bar>
  {#each links as {label, href}}
    <Navigation.Tile
      {label}
      {href}
      selected={page.url.pathname  === href}
    >
      {icon}
    </Navigation.Tile>
  {/each}
</Navigation.Bar>
```

## Anatomy

### Rail

```
<Navigation.Rail> (aside)
├── header (div)
├── tiles (div)
│   └── <Navigation.Tile> (a|button)
│       └── expanded (div)
│           └── label|labelExpanded (div)
└── footer (div)
```

### Bar

```
<Navigation.Bar> (aside)
└── tiles (div)
    └── <Navigation.Tile> (a|button)
        └── expanded (div)
            └── label|labelExpanded (div)
```

## API Reference

### NavCommon

| Property | Type | Description |
|----------|------|-------------|
| `value` | string | |
| `base` | string | Set base styles. |
| `background` | string | Set background classes. |
| `padding` | string | Set padding classes. |
| `width` | string | Set width classes. |
| `widthExpanded` | string | Set width classes for expanded mode. |
| `height` | string | Set width classes. |
| `classes` | string | Provide arbitrary CSS classes. |
| `tilesBase` | string | Set base classes. |
| `tilesFlexDirection` | string | Set flex direction classes. |
| `tilesJustify` | string | Set flex justify classes. |
| `tilesItems` | string | Set flex align classes. |
| `tilesGap` | string | Set gap classes. |
| `tilesClasses` | string | Provide arbitrary CSS classes. |
| `onValueChange` | function | Triggers when selection occurs. |

### NavBar

Inherits all NavCommon properties plus:

| Property | Type | Description |
|----------|------|-------------|
| `children` | Snippet<[]> | The default children snippet. |

### NavRail

Inherits all NavCommon properties plus:

| Property | Type | Description |
|----------|------|-------------|
| `expanded` | boolean | Enabled expanded mode. |
| `headerBase` | string | Set base classes. |
| `headerFlexDirection` | string | Set flex direction classes. |
| `headerJustify` | string | Set flex justify classes. |
| `headerItems` | string | Set flex align classes. |
| `headerGap` | string | Set gap classes. |
| `headerClasses` | string | Provide arbitrary CSS classes. |
| `footerBase` | string | Set base classes. |
| `footerFlexDirection` | string | Set flex direction classes. |
| `footerJustify` | string | Set flex justify classes. |
| `footerItems` | string | Set flex align classes. |
| `footerGap` | string | Set gap classes. |
| `footerClasses` | string | Provide arbitrary CSS classes. |
| `header` | Snippet<[]> | The header snippet. |
| `tiles` | Snippet<[]> | The tiles snippet. |
| `footer` | Snippet<[]> | The footer snippet. |

### NavTile

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Provide a unique ID. |
| `href` | string | Provide an href link; turns Tiles into an anchor |
| `target` | string | Set the href target attribute. |
| `label` | string | Provide the label text. |
| `labelExpanded` | string | Provide a longer label in expanded mode. |
| `title` | string | Provide a title attribute. |
| `selected` | boolean | Enable the active selected state. |
| `type` | "button" \| "submit" \| "reset" | Set button type. |
| `base` | string | Set base styles. |
| `width` | string | Set width classes. |
| `aspect` | string | Set aspect ratio classes. |
| `background` | string | Set background classes. |
| `hover` | string | Set hover classes. |
| `active` | string | Set active classes. |
| `padding` | string | Set padding classes. |
| `gap` | string | Set gap classes. |
| `rounded` | string | Set rounded classes. |
| `classes` | string | Provide arbitrary CSS classes. |
| `expandedPadding` | string | Set padding classes for expanded mode. |
| `expandedGap` | string | Set gap classes for expanded mode. |
| `expandedClasses` | string | Provide arbitrary CSS classes for expanded mode. |
| `labelBase` | string | Set base classes. |
| `labelClasses` | string | Provide arbitrary CSS classes. |
| `labelExpandedBase` | string | Set base classes. |
| `labelExpandedClasses` | string | Provide arbitrary CSS classes. |
| `onclick` | function | Triggers when the tile is clicked. |
| `children` | Snippet<[]> | The default slot, used for icons. |