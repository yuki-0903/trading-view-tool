<script>
</script>
<div class="load-wrapp">
  <div class="load-3">
    <div class="line bg-primary-400"></div>
    <div class="line bg-primary-300"></div>
    <div class="line bg-primary-200"></div>
  </div>
</div>

<style>
.load-wrapp {
  margin: 0 10px 10px 0;
  padding: 20px 20px 20px;
  text-align: center;
}

.load-wrapp p {
  padding: 0 0 20px;
}
.load-wrapp:last-child {
  margin-right: 0;
}

.line {
  display: inline-block;
  width: 7px;
  height: 20px;
  border-radius: 15px;
}


/* =Animate the stuff
------------------------ */
.load-1 .line:nth-last-child(1) {
  animation: loadingA 1.5s 1s infinite;
}
.load-1 .line:nth-last-child(2) {
  animation: loadingA 1.5s 0.5s infinite;
}
.load-1 .line:nth-last-child(3) {
  animation: loadingA 1.5s 0s infinite;
}

.load-2 .line:nth-last-child(1) {
  animation: loadingB 1.5s 1s infinite;
}
.load-2 .line:nth-last-child(2) {
  animation: loadingB 1.5s 0.5s infinite;
}
.load-2 .line:nth-last-child(3) {
  animation: loadingB 1.5s 0s infinite;
}

.load-3 .line:nth-last-child(1) {
  animation: loadingC 0.6s 0.1s linear infinite;
}
.load-3 .line:nth-last-child(2) {
  animation: loadingC 0.6s 0.2s linear infinite;
}
.load-3 .line:nth-last-child(3) {
  animation: loadingC 0.6s 0.3s linear infinite;
}


.l-1 {
  animation-delay: 0.48s;
}
.l-2 {
  animation-delay: 0.6s;
}
.l-3 {
  animation-delay: 0.72s;
}
.l-4 {
  animation-delay: 0.84s;
}
.l-5 {
  animation-delay: 0.96s;
}
.l-6 {
  animation-delay: 1.08s;
}
.l-7 {
  animation-delay: 1.2s;
}
.l-8 {
  animation-delay: 1.32s;
}
.l-9 {
  animation-delay: 1.44s;
}
.l-10 {
  animation-delay: 1.56s;
}

.load-7 .square {
  animation: loadingG 1.5s cubic-bezier(0.17, 0.37, 0.43, 0.67) infinite;
}

.load-8 .line {
  animation: loadingH 1.5s cubic-bezier(0.17, 0.37, 0.43, 0.67) infinite;
}

.load-9 .spinner {
  animation: loadingI 2s linear infinite;
}
.load-9 .bubble-1,
.load-9 .bubble-2 {
  animation: bounce 2s ease-in-out infinite;
}
.load-9 .bubble-2 {
  animation-delay: -1s;
}

.load-10 .bar {
  animation: loadingJ 2s cubic-bezier(0.17, 0.37, 0.43, 0.67) infinite;
}

@keyframes loadingA {
  0% {
    height: 15px;
  }
  50% {
    height: 35px;
  }
  100% {
    height: 15px;
  }
}

@keyframes loadingB {
  0% {
    width: 15px;
  }
  50% {
    width: 35px;
  }
  100% {
    width: 15px;
  }
}

@keyframes loadingC {
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(0, 15px);
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes loadingD {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes loadingE {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes loadingF {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes loadingG {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(70px, 0) rotate(360deg);
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

@keyframes loadingH {
  0% {
    width: 15px;
  }
  50% {
    width: 35px;
    padding: 4px;
  }
  100% {
    width: 15px;
  }
}

@keyframes loadingI {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: scale(0);
  }
  50% {
    transform: scale(1);
  }
}

@keyframes loadingJ {
  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(80px, 0);
    background-color: #f5634a;
    width: 25px;
  }
}
</style>