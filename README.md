# UrbanWatch AI - Illegal Construction & Encroachment Detection

UrbanWatch AI is a frontend application for urban local bodies to manually monitor unauthorized construction and encroachment across large areas. It provides a GIS-style dashboard where users can compare historical and current satellite imagery and identify areas that may contain new construction or land-use changes.

## Setup and Running the Project

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Clone or open the repository folder.
3. Install dependencies by running:
   ```bash
   npm install
   ```
4. Start the development server by running:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the local URL provided in the terminal (usually `http://localhost:5173`).

## Technologies Used

- **React & Vite**: Fast frontend framework and build tool.
- **Tailwind CSS v4**: Utility-first CSS framework for rapid styling.
- **Lucide React**: Beautiful and consistent icons.
- **Leaflet & React-Leaflet**: Interactive GIS mapping.
- **React Router Dom**: Client-side routing.

## Future Integrations

- **Supabase**: Can be integrated for authentication and backend database (mock data is currently used and ready to be replaced with Supabase queries).
- **Netlify**: Ready for easy frontend deployment via the Netlify dashboard.
