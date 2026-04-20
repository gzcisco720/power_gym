# POWER_GYM

## 基础

1. Next.js
2. Shadcn
3. TailwindCSS
4. MongoDB
5. JWT (access/refresh token)

## 用户层级

1. 健身房owner
2. 健身房教练
3. 健身房会员

## 大致Use case

1. owner 可以添加教练也可以邀请会员，教练可以邀请会员
2. （owner）会员可以被分配给不同的教练甚至owner
3. owner和教练可以给自己的会员制定饮食计划，训练计划。并可以根据之前的记录追踪变化。
4. owner和教练可以给自己的会员进行体测，并可以根据之前的记录追踪变化。体测的公式需要根据我给出的sample app来在网络上搜索相关的文献和方法。
5. 会员可以看到自己实时最新的训练计划和饮食计划。

## Samples
1. context/images/sample_app 这个文件夹下拥有我喜欢的几款软件，我需要其中我拍下来的这些功能
2. 在生成我们自己项目的Claude md时候请参考/context/docs/sample_claude.md下面有关TDD和代码best practice的部分。我们需要严格按照其中TDD的标准来做开发。