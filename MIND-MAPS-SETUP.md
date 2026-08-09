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

The pictures on your website are blurred, watermarked previews, generated
automatically from your artwork. Nobody browsing the website or the payment page
is ever shown a readable copy. The **real, full-quality file** that a customer
receives after paying has to be uploaded separately.

Each map has a file name like `mind-map-02.png`. The buyer of map 02 gets whatever
you upload under that exact name.

> **Etsy and Shopify are not covered by this automatically.** A listing you have
> already published shows a photo you uploaded to Etsy or Shopify, stored on their
> servers. Nothing on this website can change it. See
> [Replacing the photos on listings you already published](#replacing-the-photos-on-listings-you-already-published).

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
6. Afterwards, open a few products in Shopify and attach the digital file for
   delivery. **Leave the listing image as it is.** It is the blurred version, and
   that is on purpose — a listing photo is visible to everyone browsing the
   category, so a sharp one gives the map away to people who never buy.

### Replacing the photos on listings you already published

New listings created from the export above get the blurred photo automatically.
Listings that already exist do not: the photo on them is a file you uploaded to
Etsy or Shopify when you created the listing, and it lives on their servers. This
website cannot reach it. If a map still looks sharp and readable on Etsy, this is
why, and it is the only part of this that has to be done by hand.

The replacement files are ready and sized for Etsy (2000px). Each one is at:

```
https://anesthesiastudyco.com/assets/listing-images/mind-map-02.jpg
```

Change the number for each map. Open the link, save the picture, then:

**On Etsy** — Shop Manager → **Listings** → open the listing → in the Photos box,
delete the old photo and drag the saved one in → **Publish**.

**On Shopify** — **Products** → open the product → in the Media box, delete the
old image and upload the saved one → **Save**.

Work through your live listings once and they stay fixed. The website, the
payment page, and any new listing you create from the export are already handled.

### For Etsy

Etsy does not accept an upload file for new listings — every listing has to be
created in their form. So this is a worksheet rather than an import:

1. Go to:
   `https://anesthesiastudyco.com/api/mind-maps-export?format=etsy`
2. Open the downloaded file in Excel, Numbers, or Google Sheets.
3. Each row is one listing. Copy and paste the Title, Description, Price, and Tags
   columns into Etsy's **Add a listing** form.
4. Upload your full-quality artwork and attach the digital file on Etsy's side.

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
  `published: true`, and make sure the artwork is in `assets/mind-maps/` and the
  blurred versions have been generated (see `assets/mind-maps/README.md`).
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
| "Preview image coming soon" on a card | No blurred version exists for that file name | Add the artwork to `assets/mind-maps/`, then regenerate (see `assets/mind-maps/README.md`) |
| A map is sharp and readable on Etsy or Shopify | That listing's photo was uploaded to them before, and lives on their servers | Replace it from `assets/listing-images/` — see the section above |
| Customer says the download says "File not available yet" | You have not uploaded that map's full file yet | Do Step 2 for that map, then email them the file |
| Bottom bar shows $10.00 for five maps | You are looking at an old cached page | Refresh the page with Ctrl+R (or Cmd+R) |

Any question you cannot answer from this page: email `admin@anesthesiastudyco.com`
with what you clicked and what you saw.
