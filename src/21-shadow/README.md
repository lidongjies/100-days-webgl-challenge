## WebGL 阴影

绘制阴影的方法不止一种，每种方法都有它的优缺点，绘制阴影最常用的方法是使用阴影映射（shadow map），它包含多个技术点：

- 正射投影
- 透视投影
- 聚光灯
- 纹理、深度纹理 WEBGL_depth_texture
- 渲染到纹理
- 投影纹理
- 可视化相机

首先我们从光源的视角将场景绘制到深度纹理中，这个过程使用的着色器很简单，主要使用了深度纹理、透视投影、渲染到纹理三个技术点。

在渲染到纹理的技术原理中，我们是通过创建帧缓冲 framebuffer 和纹理 texture，将纹理附加在 `gl.COLOR_ATTACHMENT0` 上，如果要实现正确的排序，则还需要创建深度渲染缓冲 depthbuffer 附加到 `gl.DEPTH_ATTACHMENT`。

在渲染阴影时我们不能使用深度渲染缓冲作为一个纹理输入到着色器中，我们使用的是深度纹理 depthTexture，然后将其附加在 `DEPTH_ATTACHMENT`上。不幸的是这样还无法实现我们的需求，在 WebGL 规范中有至少[三种组合可以实现渲染到纹理的过程](https://webglfundamentals.org/webgl/lessons/zh_cn/webgl-shadows.html#attachment-combinations)。因此我们还需要创建一个颜色纹理 texture 并把它附加到 `COLOR_ATACHMENT` 上，即使我们并不会使用它。