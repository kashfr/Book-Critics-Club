export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const limit = 40;
  const startIndex = (Number(page) - 1) * limit;
  
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${query}&startIndex=${startIndex}&maxResults=${limit}`
  );
  const data = await response.json();
  
  return Response.json(data);
}