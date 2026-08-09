# Selling Mind Maps — Step-by-Step Setup

This guide is written to be followed in order, without skipping. You do not need to
understand the code. Each step says exactly what to type or click, and how to tell
whether it worked.

**What you have now:** your website shows 89 mind maps and can take card payments for
them, once you finish Step 1 and Step 2 below. Until then, the mind map page still
works, but the buy buttons send people to Etsy instead.

---

## Step 1 — Turn on card payments

Card payments are set up once, in Stripe and Netlify. Those steps now live in their
own guide so there is only one copy to keep correct:

**→ See [STRIPE-SETUP.md](STRIPE-SETUP.md)**

It covers creating the Stripe account, adding the two settings, testing with a fake
card, and switching to real money. Come back here afterwards for Step 2.

**How to tell it worked:** open your mind maps page. The yellow message saying card
payment is being switched on should be gone, and the buttons should say **Buy $2.00**
instead of sending you to Etsy. You can also open
**https://anesthesiastudyco.com/api/setup-check** at any time for a plain checklist of
what is and is not configured.

---

## Step 2 — Upload the real mind map files

The pictures on your website are previews. Every time the site publishes, it
automatically shrinks each mind map, blurs it, and stamps
`ANESTHESIASTUDYCO.COM` across it — so anyone who screenshots, saves, or hotlinks
a preview walks away with a blurred, watermarked picture and nothing else. You do
not have to prepare anything: put your normal artwork in `assets/mind-maps/` and
the protection is applied for you.

The **real, full-quality file** that a customer receives after paying is never
watermarked, and it has to be uploaded separately.

Each map has a file name like `mind-map-02.png`. The buyer of map 02 gets whatever
you upload under that exact name.

### Doing it from the Netlify website

1. Go to **https://app.netlify.com**, click your site.
2. In the left menu click **Blobs**.
3. Open the store called **digital-products** (if it is not there, use the command
   method below instead).
4. Click **Upload**, choose your full-quality file, and set its name to match
   exactly — for example `mind-map-02.png`.
5. Repeat for each map you want to sell.

### Doing it by command (faster for many files)

On your own computer, in the folder with your artwork:

```bash
netlify blobs:set digital-products mind-map-02.png --input ./Phenylephrine-full.png
netlify blobs:set digital-products mind-map-03.png --input ./NitrousOxide-full.png
```

To check what you have uploaded so far:

```bash
netlify blobs:list digital-products
```

**Important:** the name after `digital-products` must match the preview file name
exactly, including the `.png`. `mind-map-2.png` will not work — it must be
`mind-map-02.png`.

**If you forget one:** nothing breaks and no money is lost. The customer pays
normally and sees a polite message asking them to email
`admin@anesthesiastudyco.com`, and you can send the file by hand.

---

## Step 3 — Test a purchase before going live

Do this while still in Stripe **Test mode**, so no real money moves.

1. Open your mind maps page.
2. Click **Add to bundle** on five different maps. The bar at the bottom should
   show **$9.00**, not $10.00.
3. Click **Checkout $9.00**.
4. On the Stripe payment page, use this fake test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date, e.g. `12/34`
   - CVC: any three digits, e.g. `123`
   - Postcode: any, e.g. `12345`
5. Click Pay.
6. You should land on the thank-you page with a download button for each of the
   five maps. Click one and check the file that downloads is the full-quality one.

**When that works, go live:** follow Part 7 of [STRIPE-SETUP.md](STRIPE-SETUP.md).
It swaps your test key for the live one and confirms Stripe has finished approving
your account, which it must do before real payments will go through.

---

## Step 4 — Keep Shopify and Etsy showing the same maps

Your website is now the master list. Shopify and Etsy get filled in **from** it, so
all three places show the same titles at the same price.

There is no automatic robot pushing changes to Shopify and Etsy — that would need
extra passwords from both companies and could silently change your live listings.
Instead you download a file and upload it, which takes about two minutes and lets
you check it first.

### For Shopify

1. In your browser, go to:
   `https://anesthesiastudyco.com/api/mind-maps-export?format=shopify`
2. A file called `anesthesia-mind-maps-shopify.csv` downloads.
3. Go to your Shopify admin → **Products** → **Import**.
4. Choose that file and click **Upload and continue**.
5. Shopify shows you a preview. Check it, then click **Import products**.
6. The image column already points at your watermarked website previews, so the
   listings are protected as soon as they import. Attach the full-quality file as
   the digital download — and do **not** swap the listing photo for it.

### For Etsy

Etsy does not accept an upload file for new listings — every listing has to be
created in their form. So this is a worksheet rather than an import:

1. Go to:
   `https://anesthesiastudyco.com/api/mind-maps-export?format=etsy`
2. Open the downloaded file in Excel, Numbers, or Google Sheets.
3. Each row is one listing. Copy and paste the Title, Description, Price, and Tags
   columns into Etsy's **Add a listing** form.
4. For the listing photos, use the watermarked previews — see "Getting watermarked
   images to upload" below. Attach the full-quality artwork as the digital file
   Etsy delivers after payment.

### Getting watermarked images to upload

Etsy and Shopify keep their own copies of listing photos, so they need the
watermarked image files rather than a link to your site. On your own computer, in
the project folder:

```bash
npm run previews
```

This creates a folder called `preview-exports` containing a blurred, watermarked
version of every mind map, ready to upload as listing photos. It does not change
your original artwork.

If you want them blurrier or less blurry, run it like this instead — `4.5` is
blurrier, `2` is lighter:

```bash
PREVIEW_BLUR_SIGMA=4.5 npm run previews
```

**The one rule for all three shops:** the watermarked picture is what shoppers
see, and the clean full-quality file is what buyers get after paying. Never upload
the clean file as a listing photo — that is the version people can screenshot.

---

## Step 5 — Adding, renaming, or removing a mind map

There is now **one** place to edit. Open the file:

```
netlify/lib/mind-maps.ts
```

Inside you will find a long list of lines that look like this:

```ts
{ id: "map-02", file: "mind-map-02.png", title: "Phenylephrine", published: true },
```

- **To rename a map on the website**, change the words inside `title`.
- **To hide a map**, change `published: true` to `published: false`. It disappears
  from the website and can no longer be bought.
- **To show a map you have finally made artwork for**, change `published: false` to
  `published: true`, and make sure the preview image is in `assets/mind-maps/`.
- **To add a brand new map**, copy a whole line, paste it underneath, and give it a
  new `id` and `file` name that nothing else uses.

Save the file and publish. The website, the checkout price, and the Shopify and
Etsy export files all update together — you cannot accidentally change the price in
one place and forget another.

**To change the price of all mind maps**, edit these three lines near the top of the
same file (the numbers are in cents, so `200` means $2.00):

```ts
export const MIND_MAP_UNIT_AMOUNT = 200;
export const MIND_MAP_BUNDLE_SIZE = 5;
export const MIND_MAP_BUNDLE_AMOUNT = 900;
```

---

## If something goes wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| Yellow message: "Card payment on this site is being switched on" | `STRIPE_SECRET_KEY` is missing or the site has not been redeployed | Open `/api/setup-check`, then see [STRIPE-SETUP.md](STRIPE-SETUP.md) |
| Buy buttons open Etsy instead of a payment page | Same as above | Open `/api/setup-check`, then see [STRIPE-SETUP.md](STRIPE-SETUP.md) |
| "Preview image coming soon" on a card | The preview file is missing from `assets/mind-maps/` | Upload the preview image with the exact file name |
| Customer says the download says "File not available yet" | You have not uploaded that map's full file yet | Do Step 2 for that map, then email them the file |
| Bottom bar shows $10.00 for five maps | You are looking at an old cached page | Refresh the page with Ctrl+R (or Cmd+R) |

Any question you cannot answer from this page: email `admin@anesthesiastudyco.com`
with what you clicked and what you saw.
