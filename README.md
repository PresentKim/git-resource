# Git Resource Viewer

A single-page web app for previewing image files from a GitHub repository URL

[Live Demo](https://gitresource.com)

## Features

- **GitHub Repository Image Retrieval**  
  Fetch and display all image files from public or private GitHub repositories. Automatically detects the default branch.

- **Image Filtering**  
  Filter images by including or excluding specific keywords (e.g., `keyword -exclude` format).

- **Image ZIP Download**  
  Download all currently displayed images as a ZIP file in bulk.

- **Custom Virtual Scrolling**  
  Optimized rendering performance for thousands of images using a custom virtual scrolling system with IntersectionObserver.

- **GitHub API Caching**  
  Hybrid caching strategy using IndexedDB and localStorage to prevent API rate limit issues. ETag-based HTTP 304 response handling minimizes API calls.

- **GitHub Personal Access Token Support**  
  Enter your GitHub personal access token to access private repositories and increase API request limits.

- **User Settings**  
  Customize grid column count (auto/manual) and pixelated rendering options.

- **URL Sharing**  
  Share filtered views with others through URL query parameters.

- **Responsive UI**  
  Optimized user experience across different screen sizes.

## Usage

1. Enter a GitHub repository URL in the input field (e.g., `https://github.com/owner/repo`).
2. Or select one of the example repositories.
3. The app automatically detects the default branch and fetches all image files.
4. Use the filter input to include/exclude images by keywords.
5. Click "Download All" to download all displayed images as a ZIP file.
6. Adjust settings (gear icon) to customize your experience.

## Technologies

### Frontend

- **React** (`^19.0.0`) – Modern UI library with concurrent rendering
- **TypeScript** (`~5.7.2`) – Static type checking
- **Vite** (`^6.1.0`) – Fast build tool with HMR

### State Management & Routing

- **Zustand** (`^5.0.3`) – Lightweight state management
- **nuqs** (`^2.4.0`) – URL query parameter state management
- **React Router** (`^7.1.5`) – Client-side routing

### Styling

- **Tailwind CSS** (`^4.0.6`) – Utility-first CSS framework
- **tailwind-merge** (`^3.0.1`) – Smart class merging
- **clsx** (`^2.1.1`) – Conditional class names

### Performance Optimization

- **Web Workers** – Asynchronous processing for heavy operations
- **IndexedDB** (via `idb-keyval`) – Large-scale caching
- **Custom Virtual Scrolling** – Efficient rendering of thousands of images

### UI Components

- **Radix UI** – Accessible component primitives (Shadcn-based)
- **Lucide React** – Icon library

### Utilities

- **jszip** (`^3.10.1`) – ZIP file creation
- **file-saver** (`^2.0.5`) – File download handling

### Tooling & Code Quality

- **ESLint** (`^9.19.0`) – Code linting
- **Prettier** (`^3.5.1`) – Code formatting
- **TypeScript ESLint** (`^8.22.0`) – TypeScript linting

### Deployment

- **Vercel** – Static site hosting with automatic deployments

## Project Overview

For more details, refer to the full project overview:

- [📄 PROJECT_OVERVIEW (Korean)](./PROJECT_OVERVIEW.kor.md)
- [📄 PROJECT_OVERVIEW (English)](./PROJECT_OVERVIEW.md)

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview

# Lint code
yarn eslint:lint

# Fix linting issues
yarn eslint:fix

# Check code formatting
yarn format:lint

# Format code
yarn format:fix
```

## License

This project is licensed under the MIT License.
