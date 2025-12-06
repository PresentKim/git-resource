## Project Overview: Git Resource Viewer

### 1. Project Introduction

**Git Resource Viewer** is a **single-page web app** for previewing image files from a GitHub repository URL.
It is deployed via Vercel and utilizes **custom virtual scrolling** and **Web Worker** techniques to efficiently explore all images within a repository.

### 2. Key Features

- **GitHub Repository Image Retrieval**  
  Users can enter a GitHub repository URL or select an example repository to fetch and display all image files stored within that repository. The default branch is automatically detected to retrieve the image list.

- **URL Sharing**  
  Routing is implemented using React Router's BrowserRouter, and filter settings are stored in query parameters through the nuqs library, allowing the same view to be recreated when sharing a URL.

- **Image Filtering**  
  Users can filter images by including or excluding specific keywords (case-insensitive). (Example: `keyword -exclude` format)

- **Image ZIP Download**  
  All filtered images can be downloaded as a ZIP file in bulk.

- **Image Viewer**  
  Click on any image to view it in a full-screen viewer. Navigate between images using keyboard arrow keys or mouse wheel, and download individual images.

- **Minecraft Animation Support**  
  Parses `.mcmeta` files from Minecraft resource packs to support sprite sheet animations. Canvas-based animation rendering accurately plays game textures.

- **Custom Virtual Scrolling**  
  Instead of react-virtualized, a custom virtual scrolling system is implemented to optimize rendering performance for large numbers of images. IntersectionObserver is used to render only visible images.

- **GitHub API Request Caching**  
  A hybrid caching strategy using IndexedDB and localStorage is implemented to prevent functionality interruption due to API rate limits. ETag-based HTTP 304 response handling minimizes API calls.

- **Support for GitHub Personal Access Tokens**  
  Users can enter their GitHub personal access token to perform authenticated requests, increasing the API request limit and enabling access to private repositories.

- **User Settings**  
  Customizable settings such as grid column count adjustment (auto/manual), pixelated rendering options, and Minecraft animation enable/disable are provided.

- **Responsive UI**  
  The application is designed to provide an optimal user experience across different screen sizes.

### 3. Technology Stack & Justification

- **Frontend**: React 19, TypeScript, Vite  
  Code splitting using React 19's Suspense and Lazy Loading optimizes initial loading performance, and TypeScript ensures type safety.

- **Styling**: Tailwind CSS  
  A utility-first approach enables rapid and intuitive styling, reducing redundant code and improving readability.

- **State Management**: Zustand  
  A lightweight state management library that reduces unnecessary complexity, optimizes performance, and improves maintainability with a simple API.

- **URL State Management**: nuqs  
  Integrated with React Router, it allows easy management of URL query parameters as React state, enabling filter setting sharing functionality.

- **Component Library**: Radix UI (Shadcn-based)  
  Prebuilt UI components with accessibility in mind accelerate development while ensuring consistent design.

- **Data Caching**: IndexedDB (idb-keyval)  
  IndexedDB Storage is used for large-scale caching. A hybrid caching system is implemented with localStorage as a fallback for unsupported browsers.

- **Routing**: React Router (BrowserRouter)  
  Routing is implemented for static sites through Vercel's redirect configuration.

- **Performance Optimization**: Custom Virtual Scrolling + Web Workers  
  A custom virtual scrolling system is implemented instead of react-virtualized to reduce bundle size and optimize scroll performance. Web Workers are utilized to offload heavy data processing tasks from the main thread, preventing browser freezing.

- **Image Download**: jszip, file-saver  
  Functionality to compress and download multiple images as a ZIP file is implemented.

- **Animation Rendering**: Canvas API  
  Parses Minecraft `.mcmeta` files to implement sprite sheet animations using Canvas API.

- **Deployment**: Vercel  
  The application is deployed as a static site via Vercel without separate server management. Automatic deployment occurs on commits through GitHub integration.

### 4. Problem-Solving Cases

#### Large-Scale Image Rendering Issue

**Problem**: Browser lag when rendering thousands of images  
**Solution**: Custom virtual scrolling system implementation

- Optimize memory usage by rendering only visible images using IntersectionObserver
- Implement responsive layout through dynamic grid size calculation
- Provide seamless user experience during scrolling through overscan area management

#### Browser Freezing Issue

**Problem**: Browser freezing during processing of thousands of file lists (up to 30 seconds)  
**Solution**: Web Worker-based asynchronous processing system implementation

- Ensure reusability through abstract class-based Worker system design
- Implement independent caching and error recovery mechanisms for each Worker
- Design efficient communication structure between main thread and Workers

#### GitHub API Rate Limit Resolution

**Problem**: Service interruption risk due to 50 requests per hour API limit  
**Solution**: Multi-layered caching strategy and rate limit bypass logic implementation

- Minimize API calls through ETag-based HTTP 304 response handling
- Build hybrid caching system using IndexedDB as primary storage with localStorage as fallback
- Design abstracted caching interface accessible from Worker environment with the same interface
- Implement fallback data collection logic through HTML parsing when API fails

### 5. Achievements and Reflection

#### Technical Growth

- Gained experience in performance optimization using browser APIs
- Enhanced ability to design stable codebase based on type systems
- Developed skills in establishing optimization strategies for large-scale data processing
- Improved ability to efficiently utilize external APIs with limitations and design client-side strategies to complement them

#### Architecture Design Experience

- Designed Worker-based asynchronous processing architecture
- Implemented caching system utilizing multiple storage solutions
- Designed stable system with error recovery mechanisms
- Gained practical experience in caching strategies, state management, and asynchronous flow control in React applications

#### Problem-Solving Capabilities

- Learned that asynchronous processing is necessary even for data refinement tasks with large datasets
- Established strategies to overcome API limitations through multi-layered caching
- Implemented optimization strategies considering both performance and user experience
- Gained experience in designing efficient communication structures between Worker environment and main thread
