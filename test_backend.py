"""
Test script for the Skin Disease Detection Backend
Run this after starting the server to verify it's working correctly
"""

import requests
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:5000"
TEST_IMAGE_DIRS = ["train/acne", "train/eczema", "train/vitiligo"]

def test_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*60)
    print("Testing Health Check Endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✓ Health check passed!")
            print(f"  Status: {data['status']}")
            print(f"  Model Loaded: {data['model_loaded']}")
            print(f"  Device: {data['device']}")
            return True
        else:
            print(f"✗ Health check failed! Status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error connecting to server: {e}")
        print("  Make sure the server is running on http://localhost:5000")
        return False

def test_get_classes():
    """Test the classes endpoint"""
    print("\n" + "="*60)
    print("Testing Get Classes Endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/classes")
        if response.status_code == 200:
            data = response.json()
            print("✓ Classes endpoint works!")
            print(f"  Available classes: {', '.join(data['classes'])}")
            print(f"  Total classes: {data['count']}")
            return True
        else:
            print(f"✗ Classes endpoint failed! Status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_prediction():
    """Test the prediction endpoint with a sample image"""
    print("\n" + "="*60)
    print("Testing Prediction Endpoint")
    print("="*60)
    
    # Find a test image
    test_image = None
    for directory in TEST_IMAGE_DIRS:
        if os.path.exists(directory):
            files = [f for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            if files:
                test_image = os.path.join(directory, files[0])
                break
    
    if not test_image:
        print("⚠ No test image found in training directories")
        print("  Skipping prediction test")
        return None
    
    print(f"Using test image: {test_image}")
    
    try:
        with open(test_image, 'rb') as f:
            files = {'file': (os.path.basename(test_image), f, 'image/jpeg')}
            response = requests.post(f"{BASE_URL}/predict", files=files)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✓ Prediction successful!")
                print("\nResults:")
                for pred in data['predictions']:
                    print(f"  {pred['class']}: {pred['percentage']:.2f}% ({pred['confidence']} confidence)")
                return True
            else:
                print(f"✗ Prediction failed: {data.get('error')}")
                return False
        else:
            print(f"✗ Prediction failed! Status code: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  SKIN DISEASE DETECTION BACKEND TEST SUITE")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health_check()))
    results.append(("Get Classes", test_get_classes()))
    results.append(("Prediction", test_prediction()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for r in results if r[1] is True)
    failed = sum(1 for r in results if r[1] is False)
    skipped = sum(1 for r in results if r[1] is None)
    
    for test_name, result in results:
        if result is True:
            status = "✓ PASSED"
        elif result is False:
            status = "✗ FAILED"
        else:
            status = "⚠ SKIPPED"
        print(f"{test_name:20s}: {status}")
    
    print("\n" + "-"*60)
    print(f"Total: {len(results)} tests")
    print(f"Passed: {passed} | Failed: {failed} | Skipped: {skipped}")
    print("="*60)
    
    if failed == 0:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n⚠ Some tests failed. Please check the output above.")
    
    print("\nBackend is ready to use with the frontend!")
    print("Open index.html in your browser to use the application.")

if __name__ == "__main__":
    main()
