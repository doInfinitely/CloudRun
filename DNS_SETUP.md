# CloudRun DNS Setup & URL Migration

## DNS Records

Add these records at your domain registrar once you purchase `cloudrun.shop`:

```
TYPE   NAME       VALUE
─────  ─────────  ──────────────────────────
A      @          76.76.21.21
CNAME  app        cname.vercel-dns.com
CNAME  merchant   cname.vercel-dns.com
CNAME  drive      cname.vercel-dns.com
CNAME  admin      cname.vercel-dns.com
CNAME  api        (Railway deployment URL — set after Railway deploy)
```

## Domain → Vercel Project Mapping

| Custom Domain          | Vercel Project       | Current Live URL                          |
|------------------------|----------------------|-------------------------------------------|
| cloudrun.shop          | cloudrun-website     | https://cloudrun-website.vercel.app       |
| app.cloudrun.shop      | cloudrun-customer    | https://cloudrun-customer.vercel.app      |
| merchant.cloudrun.shop | cloudrun-merchant    | https://cloudrun-merchant.vercel.app      |
| drive.cloudrun.shop    | cloudrun-driver      | https://cloudrun-driver.vercel.app        |
| admin.cloudrun.shop    | cloudrun-admin       | https://cloudrun-admin.vercel.app         |
| api.cloudrun.shop      | Railway (API)        | TBD — deploy API to Railway first         |

Custom domains are already configured on each Vercel project. They'll activate automatically once DNS propagates.

## TODO: Swap Website URLs Back

After DNS is live, update `apps/website/index.html` to use the custom domains:

```
Find                                    →  Replace With
──────────────────────────────────────────────────────────────────
https://cloudrun-customer.vercel.app    →  https://app.cloudrun.shop
https://cloudrun-merchant.vercel.app    →  https://merchant.cloudrun.shop
https://cloudrun-driver.vercel.app      →  https://drive.cloudrun.shop
https://cloudrun-admin.vercel.app       →  https://admin.cloudrun.shop
```

Then redeploy the website:

```sh
cd apps/website && vercel deploy --prod --yes
```
