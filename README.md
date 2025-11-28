# Rokomari Promo Code – Jekyll Affiliate Site

Ready-to-use Jekyll site for online shopping affiliate.

## How to use

1. Upload this folder to a GitHub repo.
2. If this is a **user/organization root site** (`username.github.io`):
   - `_config.yml` already has `baseurl: ""` so you don't need to change anything.
3. If this is a **project site** (for example `username.github.io/rokomari`):
   - Edit `_config.yml` and set:

     ```yml
     baseurl: "/rokomari"
     ```

4. Put your real JSON data files into `data/*.json` following this format:

   ```json
   {
     "title": "",
     "author": "",
     "seller": "",
     "img": "",
     "desc": "",
     "link": ""
   }
   ```

5. Update `data/index.json` with the list of all JSON files you want searchable.

Cards on the home page and category pages are generated from JSON at runtime using JavaScript.
