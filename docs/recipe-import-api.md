# Recipe Import API

## Endpoint
`POST /api/recipes/import`

## Request Body
```json
{
  "url": "https://example.com/recipe-page"
}
```

## Success Response
```json
{
  "title": "Creamy Lentil Soup",
  "titleAr": "شوربة العدس الكريمية",
  "servings": 4,
  "ingredients": [
    {
      "id": "ingredient-0",
      "name": "lentils",
      "amount": 2,
      "unit": "cup",
      "nameAr": "عدس"
    }
  ],
  "instructions": [
    "Rinse lentils.",
    "Cook until tender."
  ],
  "nutrition": {
    "calories": 320,
    "protein": 18,
    "carbs": 42,
    "fats": 9
  },
  "imageUrl": "https://example.com/images/lentil-soup.jpg",
  "language": "ar"
}
```

## Error Responses

### Invalid URL (`400`)
```json
{
  "error": "Please enter a valid recipe URL",
  "code": "INVALID_URL"
}
```

### No Recipe Data (`404`)
```json
{
  "error": "Couldn't find recipe data. Try another URL",
  "code": "NO_RECIPE"
}
```

### Network Failure (`503`)
```json
{
  "error": "Connection failed. Check your internet",
  "code": "NETWORK"
}
```

### Parse Error (`422`)
```json
{
  "error": "Couldn't parse this recipe. Manual entry available",
  "code": "PARSE_ERROR"
}
```

## Notes
- Structured data (`schema.org/Recipe`) is prioritized.
- If structured data is missing, HTML fallback selectors are used.
- Arabic numerals and common Arabic cooking units are normalized.
- Language output is returned as `en` or `ar`.
- Nutrition values are expected per serving.