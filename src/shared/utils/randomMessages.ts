export interface RandomMessage {
  title: string
  description: string
  footer: string
}

export type RandomMessageGenerator = () => RandomMessage

function selectMessage(messages: RandomMessage[]): RandomMessage {
  return messages[Math.floor(Math.random() * messages.length)]
}

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
