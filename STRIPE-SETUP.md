# Setting Up Stripe — Step-by-Step

Stripe is the company that takes the card payment and sends the money to your bank.
Your website is already built to use it. This guide switches it on.

Follow the parts in order. Nothing here can break the site or lose an order — until
Part 7 you are working with fake money only.

**Time needed:** about 20 minutes, plus waiting for Stripe to verify your business.

---

## Part 1 — Create your Stripe account

Skip this if you already have one.

1. Go to **https://stripe.com** and click **Sign up**.
2. Use `admin@anesthesiastudyco.com` and pick a strong password.
3. Confirm the email Stripe sends you.
4. When it asks about your business, choose your country and enter
   **Anesthesia Study Co. LLC**.

Stripe will ask for business details, a bank account, and possibly an ID document.
You can leave that for later — everything up to Part 6 works without it. You only
need it finished before Part 7, when you start taking real money.

---

## Part 2 — Copy your test key

1. Sign in at **https://dashboard.stripe.com**.
2. Look at the **top right** for a switch labelled **Test mode**. Turn it **ON**.
   This is important. In test mode nothing is real, so you cannot make a mistake
   that costs money.
3. In the left menu click **Developers**.
4. Click **API keys**.
5. Find the row **Secret key**. Click **Reveal test key**.
6. Click it to copy. It starts with `sk_test_`.

**Keep this private.** It is the key to your money. It goes in exactly one place —
the box in Part 3. Never put it in an email, a message, a document, or a web page.
If you ever think someone has seen it, go back to this screen and click **Roll key**
to cancel it and get a new one.

---

## Part 3 — Put two values into Netlify

Netlify is where your website lives. It needs two settings.

1. Go to **https://app.netlify.com** and sign in.
2. Click your site — **tranquil-naiad-889b58**, or your own domain name if it shows
   that instead.
3. In the left menu click **Site configuration**.
4. Click **Environment variables**.

### 3a. The Stripe key

5. Click **Add a variable** → **Add a single variable**.
6. In **Key** type exactly this, with no spaces:

   ```
   STRIPE_SECRET_KEY
   ```

7. In **Value**, paste the key you copied in Part 2.
8. If it asks about scopes, choose **All scopes**.
9. Click **Create variable**.

### 3b. The download key — do this now, not later

This one protects your download links. It matters that you do it **now**, before
anyone buys anything, and here is why: if you skip it, your site quietly borrows
your Stripe key to lock the download links. That works fine — right up until Part 7,
when you swap the test key for the live one. At that moment every download link you
have ever sent a customer stops working. Setting this now avoids that entirely.

10. Click **Add a variable** → **Add a single variable** again.
11. In **Key** type exactly:

    ```
    DOWNLOAD_SIGNING_SECRET
    ```

12. In **Value** you need a long random jumble — at least 40 characters. Any of
    these work:
    - Mash the keyboard for a while: `k39fjs02mfleiw83nfjs82hfks92nfhs73ksl2`
    - Use the password generator built into your browser or password manager
    - On a Mac or Linux terminal, run `openssl rand -hex 32` and copy the result

    You never have to remember it or type it again.

13. Click **Create variable**.

**Once customers start buying, never change or delete this value.** Changing it
breaks every download link already sent out.

---

## Part 4 — Publish the change

Settings do not take effect until the site is rebuilt.

1. In the left menu click **Deploys**.
2. Click the **Trigger deploy** button, then **Deploy site**.
3. Wait for the green **Published** label. Usually under a minute.

---

## Part 5 — Check that it worked

Open this address in your browser:

**https://anesthesiastudyco.com/api/setup-check**

You will get a plain checklist page. It never shows your keys — only whether they
work. You want to see:

- **Payments are working in test mode** — yellow. Correct for now.
- **Download links are signed with their own key** — green.
- A note about product files not being uploaded — expected if you have not done
  that yet. It does not stop payments working.

If it says **Card payments are switched off**, the variable name is misspelled or the
site was not redeployed. If it says **Stripe rejected the key**, the key was copied
incompletely or has a stray space — copy it again from Part 2.

Bookmark that address. Any time you change a setting, reload it.

---

## Part 6 — Make a practice purchase

Still in test mode, so no real money moves.

1. Go to your mind maps page and click **Buy $2.00** on any map.
   (Or use the store page and add a study guide to the cart.)
2. Stripe's payment page opens. Fill it in with this fake card:

   | Field | What to type |
   | --- | --- |
   | Card number | `4242 4242 4242 4242` |
   | Expiry | any future date, e.g. `12 / 34` |
   | CVC | any 3 digits, e.g. `123` |
   | Name | anything |
   | Postcode | anything, e.g. `12345` |

3. Click **Pay**.
4. You should land on your thank-you page with a download button.
5. Go back to the Stripe dashboard (still in test mode) and click **Payments** in
   the left menu. Your practice payment is listed there.

Try it once more with **five** mind maps selected, and check the total says
**$9.00** and not $10.00.

If the download button gives a message about the file not being uploaded yet, that
is expected until you upload your artwork — see `MIND-MAPS-SETUP.md`, Step 2.
Payments are still working correctly.

---

## Part 7 — Switch to real money

Only do this once Part 6 worked.

### 7a. Finish activating Stripe

1. In the Stripe dashboard, turn the **Test mode** switch **OFF**.
2. Stripe will show you anything it still needs — business details, your bank
   account for payouts, and possibly an ID document.
3. Complete it all. Stripe usually approves within a day.

### 7b. Swap in the live key

4. Still with test mode **off**, go to **Developers** → **API keys**.
5. Reveal the **Secret key**. This one starts with `sk_live_`. Copy it.
6. Go back to Netlify → **Site configuration** → **Environment variables**.
7. Click on **STRIPE_SECRET_KEY**, then **Edit**, and replace the value with the
   live key. Leave `DOWNLOAD_SIGNING_SECRET` completely alone.
8. Save, then go to **Deploys** → **Trigger deploy** → **Deploy site**.

### 7c. Confirm

9. Reload **https://anesthesiastudyco.com/api/setup-check**.
   You want a green **Payments are live**.

   If it says **Stripe is not ready to accept live charges yet**, Stripe has not
   finished approving your account. Sign in to Stripe — it will tell you what is
   outstanding. Payments will not go through until that is done.

10. Optional but reassuring: buy one $2.00 mind map yourself with a real card. It
    is a genuine $2.00 charge to you, which you can refund from the Stripe dashboard
    afterwards, and it proves the whole path works with real money.

**You are now taking card payments on your own website.**

---

## What Stripe costs, and when you get paid

- Stripe keeps roughly **2.9% + 30¢** of each payment. On a $2.00 mind map that is
  about 36¢, leaving you around $1.64. Check
  **https://stripe.com/pricing** for the current rate in your country.
- Money lands in your bank account automatically, usually every 2 days at first,
  then faster once your account is established. You can see and change this under
  **Settings** → **Payouts** in the Stripe dashboard.
- You do not have to do anything to receive money. It happens by itself.

---

## Two optional Stripe settings worth knowing about

**Sales tax and VAT.** Digital downloads are taxable in many places, and your site
does not add tax at the moment. If you need it, turn on **Stripe Tax** in the Stripe
dashboard under **Settings** → **Tax**. Stripe then works out the right amount per
customer automatically. Whether you are required to charge it depends on where you
and your buyers are — worth asking your accountant.

**Extra payment methods.** Cards work out of the box. If you want Apple Pay, Google
Pay, Link, or Klarna, turn them on under **Settings** → **Payment methods** in
Stripe. They appear on your checkout page automatically — no change to the website
is needed.

---

## If something goes wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| Setup check says "Card payments are switched off" | The variable name is wrong, or the site was not redeployed | Check the spelling is exactly `STRIPE_SECRET_KEY`, then redeploy (Part 4) |
| Setup check says "Stripe rejected the key" | The key is incomplete, has a space in it, or was rolled | Copy it again from Stripe and paste it fresh |
| Setup check says "not ready to accept live charges" | Stripe has not finished approving your business | Sign in to Stripe and complete what it asks for |
| Buy buttons still open Etsy | The site has not rebuilt yet, or your browser cached the old page | Redeploy, then refresh with Ctrl+R (Cmd+R on a Mac) |
| Customer paid but the download failed | That product's file has not been uploaded | See `MIND-MAPS-SETUP.md` Step 2, and email them the file meanwhile |
| A customer wants a refund | Normal and easy | Stripe dashboard → **Payments** → click the payment → **Refund** |

Whatever the problem, the setup check page at **/api/setup-check** is the fastest way
to see where you stand. It never shows your keys, so it is safe to open anywhere.
