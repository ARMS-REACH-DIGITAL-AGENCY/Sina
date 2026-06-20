# Sina's Glass — New Site

Redesign for Thomasina Schnepf · sinascreations.com  
Built with React + Vite · Deployable to Vercel

---

## Stack

- **Framework:** React 18
- **Build tool:** Vite
- **Hosting:** Vercel (parallel to existing Wix site)
- **Fonts:** Cormorant Garamond (display) + Inter (body) via Google Fonts

---

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## GitHub Setup (first time)

1. Create a new repo on GitHub: `sinas-creations`
2. In this folder, run:

```bash
git init
git add .
git commit -m "Initial build — new site foundation"
git remote add origin https://github.com/YOUR_USERNAME/sinas-creations.git
git branch -M main
git push -u origin main
```

---

## Vercel Deployment

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the `sinas-creations` GitHub repo
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy

Vercel gives you a live URL like `sinas-creations.vercel.app`  
Run this in parallel with the existing Wix site.

---

## When Ready to Launch

1. Go to your domain registrar (wherever sinascreations.com DNS lives)
2. Update nameservers to Vercel's:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. In Vercel → Project Settings → Domains → Add `sinascreations.com`
4. Done. The new site goes live. Wix becomes inactive.

---

## Adding Real Product Photos

Photos go in `public/images/products/`  
Then in `src/data/products.js`, update each product's `image` field:

```js
image: '/images/products/margaux-pendant.jpg',
```

In `ProductCard.jsx`, the `<img>` tag is already set up to render when `product.image` is not null.

### Photo editing tip (background removal)
- Free: https://remove.bg
- Also free: Canva background remover
- Best background for product shots: pure black (#000000) or dark velvet texture

---

## File Structure

```
sinascreations/
├── public/
│   └── images/products/     ← drop product photos here
├── src/
│   ├── components/
│   │   ├── Nav.jsx / .css
│   │   ├── Hero.jsx / .css
│   │   ├── Shop.jsx / .css
│   │   ├── ProductCard.jsx / .css
│   │   ├── ArtistSection.jsx / .css
│   │   ├── Contact.jsx / .css
│   │   └── Footer.jsx / .css
│   ├── data/
│   │   └── products.js       ← all product names, descriptions, prices
│   ├── styles/
│   │   └── global.css        ← design tokens, type scale, utilities
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## To-Do (Next Steps)

- [ ] Add real product photography (background-removed)
- [ ] Connect contact form to Formspree or Netlify Forms
- [ ] Add Stripe or Square for real checkout (remove phone-to-purchase flow)
- [ ] Add Google Analytics / Meta Pixel
- [ ] Build out `/gallery` page with lightbox
- [ ] Write remaining named piece descriptions (345 total)
- [ ] Add Instagram feed embed
- [ ] SEO: add meta tags per page, sitemap.xml, robots.txt
