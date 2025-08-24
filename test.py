#Hello My Name Rashid
import random
print(random.randint(1, 100))


#Ikenna's Task
import numpy as np
from sklearn.linear_model import LinearRegression

# Sample data
X = np.array([1, 2, 3, 4, 5]).reshape(-1, 1)  # Feature
Y = np.array([2, 4, 5, 4, 6])  # Target

# Create and train the model
model = LinearRegression()
model.fit(X, Y)

# Make predictions
Y_pred = model.predict(X)

# Print results
print(f"Slope (coefficient): {model.coef_[0]:.2f}")
print(f"Intercept: {model.intercept_:.2f}")

# Predict new value
new_X = np.array([6]).reshape(-1, 1)
prediction = model.predict(new_X)
print(f"\nPrediction for X = 6: {prediction[0]:.2f}")

# Hi this Ikenna
