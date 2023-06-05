import {
    FaceDetector,
    FilesetResolver,
    Detection
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
  
  const demosSection = document.getElementById("demos");
  
  const questions = ["q1", "q2", "q3", "q4", "No more questions"];
   
  let num = 0;
  getQuestionsBtn.addEventListener("click", () => {
    if(num < questions.length){
        document.getElementById("questions").innerHTML = questions[num];
        num++;
    }
  });
  
  let faceDetector;
  let runningMode = "IMAGE";
  
  // Initialize the object detector
  const initializeFaceDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU"
      },
      runningMode: runningMode
    });
    demosSection.classList.remove("invisible");
  };
  initializeFaceDetector();
  
  /********************************************************************
   // Demo 2: Continuously grab image from webcam stream and detect it.
   ********************************************************************/
  
  let video = document.getElementById("webcam");
  const liveView = document.getElementById("liveView");
  let enableWebcamButton;
  
  // Check if webcam access is supported.
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  
  // Keep a reference of all the child elements we create
  // so we can remove them easily on each render.
  let children = [];
  
  // If webcam is supported, add event listener to the button for when the user wants to activate it.
  if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
  
  // Enable the live webcam view and start detection.
  async function enableCam() {
    if (!faceDetector) {
      alert("Face Detector is still loading. Please try again.");
      return;
    }
  
    // Hide the button.
    enableWebcamButton.classList.add("removed");
  
    // getUserMedia parameters
    const constraints = {
      video: true,
      audio: true // Add audio constraint to capture audio stream
    };
  
    // Activate the webcam stream.
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    } catch (error) {
      console.error(error);
    }
  }
  
  let lastVideoTime = -1;
  async function predictWebcam() {
    // If the image mode is initialized, create a new classifier with the video running mode.
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await faceDetector.setOptions({ runningMode: "VIDEO" });
    }
  
    const startTimeMs = performance.now();
  
    // Detect faces using detectForVideo.
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const detections = (await faceDetector.detectForVideo(video, startTimeMs)).detections;
      displayVideoDetections(detections);
    }
  
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  }
  
  function displayVideoDetections(detections) {
    // Remove any highlighting from the previous frame.
    for (const child of children) {
      liveView.removeChild(child);
    }
    children = [];
  
    // Iterate through the detections and draw them on the live view.
    for (const detection of detections) {
      const p = document.createElement("p");
      p.innerText =
        "Confidence: " +
        Math.round(parseFloat(detection.categories[0].score) * 100) +
        "% .";
      p.style =
        "left: " +
        (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) +
        "px;" +
        "top: " +
        (detection.boundingBox.originY - 30) +
        "px; " +
        "width: " +
        (detection.boundingBox.width - 10) +
        "px;";
  
      const highlighter = document.createElement("div");
      highlighter.setAttribute("class", "highlighter");
      highlighter.style =
        "left: " +
        (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) +
        "px;" +
        "top: " +
        detection.boundingBox.originY +
        "px;" +
        "width: " +
        (detection.boundingBox.width - 10) +
        "px;" +
        "height: " +
        detection.boundingBox.height +
        "px;";
  
      liveView.appendChild(highlighter);
      liveView.appendChild(p);
  
      // Store the drawn objects in memory so they can be removed later.
      children.push(highlighter);
      children.push(p);
  
      for (const keypoint of detection.keypoints) {
        const keypointEl = document.createElement("span");
        keypointEl.className = "key-point";
        keypointEl.style.top = `${keypoint.y * video.offsetHeight - 3}px`;
        keypointEl.style.left = `${
          video.offsetWidth - keypoint.x * video.offsetWidth - 3
        }px`;
        liveView.appendChild(keypointEl);
        children.push(keypointEl);
      }
    }
  }
  
  // Recording logic
  let mediaRecorder;
  let recordedChunks = [];
  const recordedVideo = document.getElementById("recordedVideo");
  const recordButton = document.getElementById("recordButton");
  const stopButton = document.getElementById("stopButton");
  
  // Start recording
  recordButton.addEventListener("click", () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(video.srcObject);
      mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorder.start();
      recordButton.classList.add("disabled");
      stopButton.classList.remove("disabled");
    }
  });
  
  // Stop recording
  stopButton.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      recordButton.classList.remove("disabled");
      stopButton.classList.add("disabled");
    }
  });
  
  // Handle recorded data
  function handleDataAvailable(event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  }
  
  // Play recorded video
  playButton.addEventListener("click", () => {
    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
    const recordedUrl = URL.createObjectURL(recordedBlob);
    recordedVideo.src = recordedUrl;
    recordedVideo.controls = true;
  });
  