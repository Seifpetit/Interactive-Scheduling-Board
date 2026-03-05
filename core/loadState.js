export async function loadState() {
  try {
    const response = await fetch("./backend/state");

    if(!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Failed to loadState!");
  };
  return null;
}