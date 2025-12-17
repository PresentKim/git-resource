export interface RandomMessage {
  title: string
  description: string
  footer: string
}

export type RandomMessageGenerator = () => RandomMessage

function selectMessage(messages: RandomMessage[]): RandomMessage {
  return messages[Math.floor(Math.random() * messages.length)]
}

const NOT_FOUND_MESSAGES: RandomMessage[] = [
  {
    title: 'Oops! Who turned off the lights? 🔍',
    description: 'went on vacation without leaving a forwarding address! 🏖️',
    footer: "Maybe it's playing hide and seek? 🙈",
  },
  {
    title: 'Houston, we have a problem! 🚀',
    description: 'has gone to explore the digital universe! 🌌',
    footer: 'Should we send a search party? 🔭',
  },
  {
    title: '404 - Page Missing in Action! 🕵️',
    description: 'seems to have joined the witness protection program! 🥸',
    footer: "We're putting up 'Missing Page' posters as we speak! 📜",
  },
  {
    title: 'Whoopsie Daisy! 🌼',
    description: 'took a wrong turn at the last server! 🚦',
    footer: "Even GPS can't find this page! 🗺️",
  },
  {
    title: 'Null Pointer Exception! 💻',
    description: 'is stuck in an infinite loop somewhere! 🔄',
    footer: 'Time to debug this reality! 🐛',
  },
  {
    title: 'Pixel Perfect? Not Found! 🎨',
    description: 'lost all its pixels in a tragic compression accident! 🖼️',
    footer: 'Someone call the graphic designer! 🎯',
  },
  {
    title: 'Git Blame Shows Nothing! 🤔',
    description: 'was force-pushed to the void! 📥',
    footer: 'Time to check the commit history... 📝',
  },
  {
    title: 'CSS Overflow: Hidden 🎭',
    description: 'is hiding behind a z-index: -9999! 🗂️',
    footer: 'Have you tried turning flexbox off and on again? 🔄',
  },
]
export const generateNotFoundMessage: RandomMessageGenerator = () =>
  selectMessage(NOT_FOUND_MESSAGES)

const BRANCH_FETCH_MESSAGES: RandomMessage[] = [
  {
    title: 'Loading default branch...',
    description:
      'Just a moment while we fetch the default branch for this repository.',
    footer: 'This is where the magic begins! 🪄',
  },
  {
    title: 'Branch Discovery Mission! 🌳',
    description: 'Exploring the repository jungle for the main branch.',
    footer: 'Almost found our way through! 🧭',
  },
  {
    title: 'Git Detective at Work! 🕵️',
    description: 'Investigating which branch leads the way.',
    footer: 'Following the commit trail... 🔍',
  },
  {
    title: 'Branch Safari! 🦁',
    description: 'Tracking down the default branch in the wild.',
    footer: 'Adventure awaits in the repository! 🌿',
  },
  {
    title: 'Branching Out! 🌿',
    description: 'Determining which branch is the chosen one.',
    footer: 'The Git tree is growing... 🌱',
  },
  {
    title: 'Branch Quest 2024! 🎮',
    description: 'Leveling up to find the primary branch.',
    footer: 'Loading next checkpoint... ⭐',
  },
]
export const generateBranchFetchMessage: RandomMessageGenerator = () =>
  selectMessage(BRANCH_FETCH_MESSAGES)

const IMAGE_FETCH_MESSAGES: RandomMessage[] = [
  {
    title: 'Loading image files...',
    description:
      'Just a moment while we fetch the image files for this repository.',
    footer: 'This is where the magic begins! 🪄',
  },
  {
    title: 'Picture Party Loading! 🎉',
    description: 'Gathering all the visual treasures from this repository.',
    footer: 'The pixels are getting ready for their big debut! ✨',
  },
  {
    title: 'Image Hunt in Progress! 🔍',
    description: 'Searching every branch and commit for beautiful visuals.',
    footer: 'Almost ready for the grand reveal! 🎬',
  },
  {
    title: 'Pixel Parade Coming! 🎪',
    description: 'Assembling a wonderful gallery of images just for you.',
    footer: 'Get your virtual viewing glasses ready! 👓',
  },
  {
    title: 'Digital Art Express! 🚂',
    description: 'Collecting all the pictures from across the repository.',
    footer: 'Next stop: Visual wonderland! 🌈',
  },
  {
    title: 'Photo Fetch Fiesta! 📸',
    description: 'Downloading your repository images with style.',
    footer: 'Time to prepare the virtual gallery! 🖼️',
  },
]
export const generateImageFetchMessage: RandomMessageGenerator = () =>
  selectMessage(IMAGE_FETCH_MESSAGES)

const NO_IMAGES_MESSAGES: RandomMessage[] = [
  {
    title: 'No images found! 🖼️',
    description: 'There are no image files in this repository.',
    footer: 'Time to add some color! 🌈',
  },
  {
    title: 'Empty Canvas! 🎨',
    description: 'This repository is waiting for its first masterpiece.',
    footer: 'Maybe add some JPEGs or PNGs to brighten things up? ✨',
  },
  {
    title: 'Picture Perfect Void! 📷',
    description: 'Looks like all the images went on vacation!',
    footer: 'Time to upload some visual content! 🎞️',
  },
  {
    title: 'Pixel Desert! 🏜️',
    description: 'Not a single image in sight...',
    footer: "Let's make this place more photogenic! 📸",
  },
  {
    title: 'Gallery Under Construction! 🚧',
    description: 'This repository needs some visual inspiration.',
    footer: 'Ready for your artistic contributions! 🎭',
  },
]
export const generateNoImagesMessage: RandomMessageGenerator = () =>
  selectMessage(NO_IMAGES_MESSAGES)
