# [Song Studio - Suno](https://tkellehe.github.io/suno-song-studio/)
Tools for making Suno prompts easier and more intuitive to get closers to what you want on the first try.

## v0

The project is an attempt to do everything through GitHub pages.
Therein, we must build models and tools that run client side.
The beta version will utilize tfjs with its USE model for embeddings.
This works on multiple browsers and is fast enough to even work on mobile.

### v0.1
The first version will focus on providing a consistent way to produce tags for song and style descriptions.
We will ignore some common optimizations for a working product.

#### Features

 * Prompt-to-Tags
 > Take a description of a style, genre, sound, or even song and it will suggest include and exclude tags to make your song exhibit those characteristics.
 > Combines 240 different tags in meaningful ways for Suno to produce closer somgs on the first try.