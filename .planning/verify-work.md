# Verify Work

Run these checks after implementing feature work:

1. `pnpm test`
2. `pnpm lint`
3. `curl -sS --get 'http://localhost:3000/api/image-search' --data-urlencode 'q=köttbullar med potatis och brunsås'`
4. `curl -sS -X POST 'http://localhost:3000/api/dish-image' -H 'Content-Type: application/json' -d '{"dishName":"Korv stroganoff"}'`

Manual verification:

- Meal drawer: add flow can generate image and then save.
- Admin panel: new meal + existing row can generate image and preview before save.
- Repeated generation request for same dish returns existing image (`wasGenerated: false`).

