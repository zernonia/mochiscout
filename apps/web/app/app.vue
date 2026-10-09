<template>
  <NuxtLoadingIndicator color="#171717" :height="2" :throttle="100" />
  <ToastProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ToastProvider>
</template>
